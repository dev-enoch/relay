import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@relay/database';
import { SubmitJobDto, JobStatus, assertValidTransition } from '@relay/job-contracts';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs-queue') private readonly jobsQueue: Queue,
  ) {}

  async submitJob(dto: SubmitJobDto, ownerId: string) {
    
    const existing = await this.prisma.job.findUnique({
      where: {
        owner_id_idempotency_key: {
          owner_id: ownerId,
          idempotency_key: dto.idempotencyKey,
        },
      },
    });

    const requestHash = JSON.stringify({ type: dto.type, payload: dto.payload });

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictException('Idempotency key already used with different payload');
      }
      return existing;
    }

    try {
      const job = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdJob = await tx.job.create({
          data: {
            type: dto.type,
            payload: dto.payload as Prisma.InputJsonValue,
            status: JobStatus.PENDING,
            idempotency_key: dto.idempotencyKey,
            request_hash: requestHash,
            max_attempts: 3,
            owner_id: ownerId,
          },
        });

        await tx.outboxEvent.create({
          data: {
            type: 'JOB_CREATED',
            aggregate_id: createdJob.id,
            payload: { jobId: createdJob.id, maxAttempts: createdJob.max_attempts } as Prisma.InputJsonValue,
            dispatch_status: 'PENDING',
          },
        });

        return createdJob;
      });

      return job;
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as Record<string, unknown>).code === 'P2002') {
        throw new ConflictException('Concurrent submission detected');
      }
      throw e;
    }
  }

  async getJob(id: string, ownerId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id, owner_id: ownerId },
      include: { attempts: true },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async listJobs(ownerId: string, status?: string, type?: string, limit = 20) {
    const where: Record<string, unknown> = { owner_id: ownerId };
    if (status) where.status = status;
    if (type) where.type = type;

    return this.prisma.job.findMany({
      where,
      take: Math.min(limit, 100),
      orderBy: { created_at: 'desc' },
    });
  }

  async cancelJob(id: string, ownerId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id, owner_id: ownerId },
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const cancellableStatuses = [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RETRY_SCHEDULED];
      if (!cancellableStatuses.includes(job.status as JobStatus)) {
        throw new BadRequestException(`Cannot cancel job in status ${job.status}`);
      }

      assertValidTransition(job.status as JobStatus, JobStatus.CANCELLED);

      try {
        await this.jobsQueue.remove(id);
      } catch (err) {
        this.logger.warn(`Failed to cleanly remove job ${id} from BullMQ: ${err}`);
      }

      const updatedJob = await tx.job.update({
        where: { id },
        data: { status: JobStatus.CANCELLED, completed_at: new Date() },
      });

      return updatedJob;
    });
  }

  // Point 4: Worker crash recovery
  // Finds jobs stuck in RUNNING state for more than 5 minutes
  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStalledJobs() {
    const stalledThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const stalledJobs = await this.prisma.job.findMany({
      where: {
        status: JobStatus.RUNNING,
        started_at: { lt: stalledThreshold },
      },
    });

    if (stalledJobs.length === 0) return;

    this.logger.warn(`Found ${stalledJobs.length} stalled jobs. Recovering...`);

    for (const job of stalledJobs) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          last_error_code: 'Worker crashed or stalled during execution',
        },
      });
      this.logger.log(`Recovered stalled job ${job.id} (marked as FAILED)`);
    }
  }
}
