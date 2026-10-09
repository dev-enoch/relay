import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@relay/database';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobStatus } from '@relay/job-contracts';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('jobs-queue') private readonly jobsQueue: Queue,
  ) {}

  private getRetryDelayMs(attempts: number): number {
    return Math.min(1000 * 2 ** Math.max(attempts - 1, 0), 30000);
  }

  @Cron(CronExpression.EVERY_SECOND)
  async processOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          dispatch_status: 'PENDING',
          OR: [{ next_retry_at: null }, { next_retry_at: { lte: new Date() } }],
        },
        take: 50,
        orderBy: { created_at: 'asc' },
      });

      for (const event of events) {
        try {
          const payload = event.payload as { jobId?: string; maxAttempts?: number };
          const jobId = payload?.jobId;

          if (!jobId) {
            throw new Error('Outbox event payload missing jobId');
          }

          const maxAttempts = payload.maxAttempts ?? 3;

          await this.prisma.job.update({
            where: { id: jobId },
            data: { status: JobStatus.QUEUED },
          });

          await this.jobsQueue.add(
            event.type,
            { jobId },
            {
              jobId,
              attempts: maxAttempts,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            },
          );

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { dispatch_status: 'DISPATCHED', next_retry_at: null },
          });

          this.logger.log(`Dispatched job ${jobId} to jobs-queue`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to dispatch event ${event.id}:`, error);

          const retryDelayMs = this.getRetryDelayMs((event.dispatch_attempts ?? 0) + 1);

          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              dispatch_status: 'PENDING',
              dispatch_attempts: { increment: 1 },
              next_retry_at: new Date(Date.now() + retryDelayMs),
              last_error_code: message,
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
