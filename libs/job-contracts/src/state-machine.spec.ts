import { describe, it, expect } from 'vitest';
import { JobStatus } from './job-status.enum.js';
import { canTransition } from './state-machine.js';

describe('Job State Machine', () => {
  it('should allow PENDING to QUEUED', () => {
    expect(canTransition(JobStatus.PENDING, JobStatus.QUEUED)).toBe(true);
  });

  it('should allow QUEUED to CANCELLED', () => {
    expect(canTransition(JobStatus.QUEUED, JobStatus.CANCELLED)).toBe(true);
  });

  it('should not allow SUCCEEDED to FAILED', () => {
    expect(canTransition(JobStatus.SUCCEEDED, JobStatus.FAILED)).toBe(false);
  });

  it('should not allow RUNNING to QUEUED', () => {
    expect(canTransition(JobStatus.RUNNING, JobStatus.QUEUED)).toBe(false);
  });
});
