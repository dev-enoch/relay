# Relay: Reliable Distributed Job Processing Platform

Relay is a production-oriented backend job-processing platform for reliable asynchronous task execution. It combines NestJS, PostgreSQL, Redis, and BullMQ to provide a durable workflow for job submission, retries, worker execution, and operational visibility.

## Why this project matters

This project is designed to reflect the patterns that matter in real distributed systems:

- transactional outbox for reliable dispatch
- idempotent job submission
- retry and dead-letter handling
- durable job lifecycle tracking
- health checks and operational guardrails
- deployment workflows for real environments

## Key capabilities

- Transactional outbox pattern to bridge Postgres and Redis reliably
- Idempotent job submission by owner and idempotency key
- BullMQ-based background processing with retry behavior
- Job lifecycle tracking from pending to running to success or failure
- API key authentication for service-level access
- Observability-friendly health endpoints and response metadata

## Tech stack

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Vitest
- Docker

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/production-hardening.md](docs/production-hardening.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
- [LICENSE](LICENSE)

## Quick start

### Prerequisites

- Node.js 20+
- Yarn 1.x
- Docker and Docker Compose

### Start infrastructure

```bash
docker-compose up -d
```

### Configure environment

```bash
cp .env.example .env
```

### Install dependencies and initialize the database

```bash
yarn install
yarn prisma db push
```

### Run application

```bash
yarn start:dev
```

### Run validation checks

```bash
yarn test
yarn test:e2e
yarn build
```

## API endpoints

### Submit a job

POST /v1/jobs

```json
{
  "type": "webhook.deliver",
  "payload": {
    "url": "https://api.example.com/webhooks",
    "method": "POST",
    "body": { "event": "user.created" }
  },
  "idempotencyKey": "req_12345"
}
```

### Get job status

GET /v1/jobs/:id

### List jobs

GET /v1/jobs?status=PENDING&type=webhook.deliver&limit=20

## Production workflow

The repository includes GitHub Actions for:

- CI validation
- image release publishing
- production deployment

See the workflow files in [.github/workflows](.github/workflows).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Security

For vulnerability disclosures, see [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Standards and governance

- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [ATTRIBUTIONS.md](ATTRIBUTIONS.md)
