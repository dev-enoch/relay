# Operations Guide

## Health checks

Application health endpoints are available at:

- /health/live
- /health/ready

These checks confirm the process is alive and required dependencies are reachable.

## Operational recommendations

- monitor queue backlog and retry rates
- track job completion latency by type
- alert on stalled jobs or DB connectivity issues
- review dead-letter transitions regularly
- rotate API keys in production environments
- keep dependency versions current

## Common failure patterns

### Redis outage

Jobs cannot be enqueued or processed. Recovery requires restoring Redis service and reprocessing any pending outbox events or retryable jobs.

### Postgres outage

The application cannot write jobs or updates. Recovery requires restoring Postgres and validating consistency of job states.

### Worker crash

Jobs stuck in RUNNING state must be reconciled by operators or by a recovery routine.

## Logging

Use structured logs and request IDs to correlate events across API, queue, and worker layers.
