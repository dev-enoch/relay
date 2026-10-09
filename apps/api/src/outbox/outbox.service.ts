import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@relay/database';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobStatus, canTransition } from '@relay/job-contracts';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs-queue') private readonly jobsQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find pending outbox events (or ones that need retry)
      const events = await this.prisma.outboxEvent.findMany({
        where: { 
          dispatch_status: 'PENDING',
          OR: [
            { next_retry_at: null },
            { next_retry_at: { lte: new Date() } }
          ]
        },
        take: 50,
        orderBy: { created_at: 'asc' },
      });

      for (const event of events) {
        try {
          // Enqueue to BullMQ
          // The job payload itself is part of the event payload
          const payload = event.payload as any;
          const maxAttempts = payload.maxAttempts ?? 3;
          
          await this.jobsQueue.add(event.type, {
            jobId: payload.jobId,
          }, {
            jobId: payload.jobId, // Use database job ID as BullMQ Job ID for idempotency
            attempts: maxAttempts,
            backoff: {
              type: 'exponential',
              delay: 2000, // Wait 2s, 4s, 8s...
            },
          });

          // Update both OutboxEvent and Job transactionally
          await this.prisma.$transaction(async (tx) => {
            const currentJob = await tx.job.findUnique({ where: { id: payload.jobId } });
            if (currentJob && canTransition(currentJob.status as JobStatus, JobStatus.QUEUED)) {
              await tx.job.update({
                where: { id: payload.jobId },
                data: { status: JobStatus.QUEUED },
              });
            }

            await tx.outboxEvent.update({
              where: { id: event.id },
              data: { dispatch_status: 'DISPATCHED' },
            });
          });

          this.logger.log(`Dispatched job ${payload.jobId} to jobs-queue`);
        } catch (error) {
          this.logger.error(`Failed to dispatch event ${event.id}:`, error);
          
          const attempts = event.dispatch_attempts + 1;
          const isDeadLetter = attempts >= 5;
          const backoffDelay = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s...
          
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { 
              dispatch_attempts: attempts,
              dispatch_status: isDeadLetter ? 'DEAD_LETTERED' : 'PENDING',
              next_retry_at: isDeadLetter ? null : new Date(Date.now() + backoffDelay),
              last_error_code: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in outbox processor:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
