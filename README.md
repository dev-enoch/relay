# Relay: Reliable Distributed Job Processing Platform

Relay is a production-grade backend job-processing platform designed for high-throughput, reliable asynchronous task execution. It demonstrates advanced backend architecture, distributed systems patterns, and infrastructure engineering best practices.

## 🚀 Key Features

*   **Transactional Outbox Pattern:** Guarantees at-least-once job dispatch from the primary Postgres database to the Redis message broker, eliminating dual-write inconsistencies.
*   **Idempotency & Concurrency Control:** Enforces strict idempotency on job submission using a unique composite key (`owner_id` + `idempotency_key`), preventing duplicate executions even under concurrent requests or network retries.
*   **Robust Background Processing:** Built on top of **BullMQ** for distributed job execution, featuring exponential backoff strategies, maximum retry limits, and dead-letter queue (DLQ) transitions for unrecoverable errors.
*   **Graceful Shutdown & Data Integrity:** Ensures running workers correctly finish processing or checkpoint their state before exiting when receiving SIGTERM signals, protecting against data corruption during deployments.
*   **End-to-End Observability:** Tracks granular job attempts, latency metrics, and failure states persistently in the database.

## 🛠️ Technology Stack

*   **Framework:** [NestJS](https://nestjs.com/) (Node.js) - Providing a modular, enterprise-ready architecture.
*   **Language:** TypeScript (Strict Mode) - Enforcing type safety and avoiding `any` types.
*   **Database:** PostgreSQL 16 - Serving as the primary persistent data store.
*   **ORM:** [Prisma](https://www.prisma.io/) (v6) - Type-safe database client and schema management.
*   **Message Broker / Queue:** Redis & [BullMQ](https://docs.bullmq.io/) - High-performance background job processing.
*   **Package Manager:** Yarn
*   **Testing:** Vitest (E2E API and integration testing)

## 🏗️ Architecture

1.  **Client Application** submits a job via the REST API (`POST /v1/jobs`).
2.  **API Gateway (Jobs Module)** validates the request, checks for idempotency, and opens a transaction.
3.  **Database Transaction:** The API writes the `Job` record and an `OutboxEvent` simultaneously to PostgreSQL. If this succeeds, the client gets a `202 Accepted` response.
4.  **Outbox Poller (Cron):** A scheduled dispatcher reads pending `OutboxEvents` and enqueues them into the BullMQ `jobs-queue`.
5.  **Job Processor (Worker):** The worker picks up the job, transitions its state in PostgreSQL to `RUNNING`, and simulates the execution workload.
6.  **Recovery & DLQ:** If the worker crashes or the job fails, BullMQ retries the job using exponential backoff. Non-retryable errors immediately transition the job to a `DEAD_LETTERED` state.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v20+)
*   Yarn (v1.22+)
*   Docker & Docker Compose

### 1. Start Infrastructure (Postgres & Redis)
```bash
docker-compose up -d
```
*(This starts PostgreSQL on port `5433` and Redis on `6379`)*

### 2. Environment Setup
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` matches the running Postgres instance.

### 3. Install Dependencies
```bash
yarn install
```

### 4. Initialize Database Schema
```bash
yarn prisma db push
```

### 5. Run the Application
```bash
yarn start:dev
```
*The API will be available at `http://localhost:3000`.*

### 6. Run E2E Tests
```bash
yarn test:e2e
```

## 📚 API Endpoints

### Submit a Job
`POST /v1/jobs`
```json
{
  "type": "video_encoding",
  "payload": {
    "fileId": "abc-123",
    "resolution": "1080p"
  },
  "idempotencyKey": "req_12345"
}
```

### Check Job Status
`GET /v1/jobs/:id`

## 👨‍💻 Author

Built as a portfolio demonstration for production-level backend engineering.
