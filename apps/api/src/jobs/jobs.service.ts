import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@relay/database';
import { SubmitJobDto, JobStatus } from '@relay/job-contracts';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

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

      const updatedJob = await tx.job.update({
        where: { id },
        data: { status: JobStatus.CANCELLED, completed_at: new Date() },
      });

      // We should ideally tell BullMQ to remove it from the queue as well,
      // but for this MVP, updating the status prevents the worker from processing it
      // if we also check status in JobsProcessor.

      return updatedJob;
    });
  }
}
