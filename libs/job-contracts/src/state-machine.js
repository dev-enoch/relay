import { JobStatus } from './job-status.enum.js';
export const ValidTransitions = {
    [JobStatus.PENDING]: new Set([JobStatus.QUEUED, JobStatus.CANCELLED]),
    [JobStatus.QUEUED]: new Set([JobStatus.RUNNING, JobStatus.CANCELLED]),
    [JobStatus.RUNNING]: new Set([
        JobStatus.SUCCEEDED,
        JobStatus.FAILED,
        JobStatus.RETRY_SCHEDULED,
        JobStatus.DEAD_LETTERED,
    ]),
    [JobStatus.RETRY_SCHEDULED]: new Set([JobStatus.QUEUED, JobStatus.CANCELLED]),
    [JobStatus.SUCCEEDED]: new Set([]),
    [JobStatus.FAILED]: new Set([]),
    [JobStatus.DEAD_LETTERED]: new Set([]),
    [JobStatus.CANCELLED]: new Set([]),
};
export function canTransition(from, to) {
    return ValidTransitions[from].has(to);
}
//# sourceMappingURL=state-machine.js.map