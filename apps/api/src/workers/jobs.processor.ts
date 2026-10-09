import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@relay/database';
import { JobStatus, canTransition } from '@relay/job-contracts';

@Processor('jobs-queue')
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: BullJob<any, any, string>): Promise<any> {
    const jobId = job.data.jobId;
    this.logger.log(`Processing job ${jobId}`);

    const dbJob = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!dbJob) throw new UnrecoverableError('Job not found in DB');
    
    if (dbJob.status === JobStatus.CANCELLED) {
      this.logger.log(`Job ${jobId} was cancelled. Skipping.`);
      return;
    }

    if (!canTransition(dbJob.status as JobStatus, JobStatus.RUNNING)) {
      this.logger.warn(`Invalid transition from ${dbJob.status} to RUNNING for job ${jobId}`);
      throw new UnrecoverableError('Invalid state transition');
    }

    // Mark job as PROCESSING
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        started_at: new Date(),
        attempt_count: { increment: 1 },
      },
    });

    const attempt = await this.prisma.jobAttempt.create({
      data: {
        job_id: jobId,
        attempt_number: job.attemptsMade + 1,
        worker_id: `worker-${process.pid}`,
      },
    });

    try {
      // Simulate generic job execution
      await this.simulateJobExecution(dbJob.payload);

      // Mark success
      await this.prisma.$transaction([
        this.prisma.job.update({
          where: { id: jobId },
          data: { status: JobStatus.SUCCEEDED, completed_at: new Date() },
        }),
        this.prisma.jobAttempt.update({
          where: { id: attempt.id },
          data: {
            outcome: 'SUCCESS',
            finished_at: new Date(),
            duration_ms: Date.now() - attempt.started_at.getTime(),
          },
        }),
      ]);
    } catch (error) {
      this.logger.error(`Failed job ${jobId}`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isUnrecoverable = error instanceof UnrecoverableError;
      const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1);

      let nextStatus = JobStatus.RETRY_SCHEDULED;
      if (isUnrecoverable) {
        nextStatus = JobStatus.FAILED;
      } else if (isFinalAttempt) {
        nextStatus = JobStatus.DEAD_LETTERED;
      }

      await this.prisma.$transaction([
        this.prisma.job.update({
          where: { id: jobId },
          data: { status: nextStatus, last_error_code: errorMessage },
        }),
        this.prisma.jobAttempt.update({
          where: { id: attempt.id },
          data: {
            outcome: 'FAILED',
            error_code: errorMessage,
            finished_at: new Date(),
            duration_ms: Date.now() - attempt.started_at.getTime(),
          },
        }),
      ]);
      
      throw error; // Let BullMQ handle retries
    }
  }

  private async simulateJobExecution(payload: any) {
    if (!payload) return;

    if (payload.type === 'webhook.deliver') {
      try {
        const response = await fetch(payload.url, {
          method: payload.method || 'POST',
          headers: payload.headers || { 'Content-Type': 'application/json' },
          body: payload.body ? JSON.stringify(payload.body) : undefined,
        });

        if (!response.ok) {
          if (response.status >= 500) {
            throw new Error(`Webhook failed with status ${response.status} (Retryable)`);
          } else {
            throw new UnrecoverableError(`Webhook failed with status ${response.status} (Unrecoverable)`);
          }
        }
        return;
      } catch (error) {
        if (error instanceof UnrecoverableError) throw error;
        // Network errors are retryable
        throw new Error(`Webhook network failure: ${(error as Error).message}`);
      }
    }

    if (payload.simulateError === 'non-retryable') {
      throw new UnrecoverableError('Simulated non-retryable error (Unrecoverable)');
    }
    if (payload.simulateError === 'retryable') {
      throw new Error('Simulated temporary network issue (Retryable)');
    }

    // Basic simulation for other types
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
