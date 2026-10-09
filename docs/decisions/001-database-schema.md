# Database Schema Decisions

## Source of Truth
We are using PostgreSQL as the primary source of truth for jobs. A job is only considered accepted if it has been durably written to the `jobs` table.

## Idempotency
To prevent duplicate job creation, we enforce idempotency using a database-level unique constraint on the combination of `owner_id` and `idempotency_key`. We also store a `request_hash` to detect when a client reuses an idempotency key with a different payload. This allows us to reject incompatible requests (HTTP 409 Conflict) while safely returning the original job for exact duplicates.

## Transactional Outbox
To ensure that a job is eventually processed by background workers (BullMQ), we use the **Transactional Outbox Pattern**. When a job is created, an `outbox_events` record is inserted in the exact same database transaction. A separate dispatcher process will read these events and publish them to Redis. This prevents the scenario where a job is saved to the database but fails to be enqueued in Redis because of a temporary Redis outage.

## Attempt Tracking
Each execution attempt is logged in a `job_attempts` table, referencing the `job_id` via a foreign key with `Cascade` deletion. This ensures that when a job is deleted, its execution history is cleaned up.

## Data Types
- We use `UUID` for primary keys to allow distributed ID generation if needed later and to obfuscate sequence IDs.
- `JSONB` (mapped to `Json` in Prisma) is used for job payloads and diagnostic metadata to support flexible schemas.
