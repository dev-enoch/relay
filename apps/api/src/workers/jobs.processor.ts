import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@relay/database';
import { JobStatus } from '@relay/job-contracts';

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
      
      const nextStatus = (isFinalAttempt || isUnrecoverable) ? JobStatus.DEAD_LETTERED : JobStatus.RETRY_SCHEDULED;

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
    if (payload && payload.simulateError === 'non-retryable') {
      throw new UnrecoverableError('Simulated non-retryable error (Unrecoverable)');
    }
    if (payload && payload.simulateError === 'retryable') {
      throw new Error('Simulated temporary network issue (Retryable)');
    }

    // Basic simulation
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
