import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JobStatus } from '@relay/job-contracts';
import { OutboxService } from './outbox.service.js';

describe('OutboxService', () => {
  let prisma: any;
  let queue: any;
  let service: OutboxService;

  beforeEach(() => {
    prisma = {
      outboxEvent: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      job: {
        update: vi.fn(),
      },
    };

    queue = {
      add: vi.fn(),
    };

    service = new OutboxService(prisma, queue);
  });

  it('should mark a queued job as QUEUED and dispatch ready events', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'evt-1',
        type: 'JOB_CREATED',
        payload: { jobId: 'job-1', maxAttempts: 3 },
        dispatch_status: 'PENDING',
        dispatch_attempts: 0,
        next_retry_at: null,
        created_at: new Date(),
      },
    ]);
    queue.add.mockResolvedValue({});

    await service.processOutbox();

    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: JobStatus.QUEUED },
    });
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { dispatch_status: 'DISPATCHED', next_retry_at: null },
    });
  });

  it('should retry failed dispatches with a backoff timestamp', async () => {
    prisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'evt-2',
        type: 'JOB_CREATED',
        payload: { jobId: 'job-2', maxAttempts: 3 },
        dispatch_status: 'PENDING',
        dispatch_attempts: 1,
        next_retry_at: null,
        created_at: new Date(),
      },
    ]);
    queue.add.mockRejectedValue(new Error('Redis unavailable'));

    await service.processOutbox();

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'evt-2' },
      data: {
        dispatch_status: 'PENDING',
        dispatch_attempts: { increment: 1 },
        next_retry_at: expect.any(Date),
        last_error_code: 'Redis unavailable',
      },
    });
  });
});
