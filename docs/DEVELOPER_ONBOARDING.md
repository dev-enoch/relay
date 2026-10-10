# Developer Onboarding Guide

This guide explains how a developer can start using Relay in a local environment and integrate with it as a background job service.

## 1. Prerequisites

- Node.js 20+
- Yarn 1.x
- Docker and Docker Compose
- Access to a valid API key

## 2. Start the local infrastructure

```bash
docker-compose up -d
```

This starts:

- PostgreSQL on port 5433
- Redis on port 6379

## 3. Configure environment

```bash
cp .env.example .env
```

Make sure the values match the local services.

## 4. Install dependencies and initialize DB

```bash
yarn install
yarn prisma db push
```

## 5. Run the app

```bash
yarn start:dev
```

The API will be available on:

```bash
http://localhost:3000
```

## 6. Use an API key

The app expects an API key in the x-api-key header.

For local development, the example key is:

```bash
demo-secret-key
```

## 7. Submit your first job

```bash
curl -X POST http://localhost:3000/v1/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-secret-key" \
  -d '{
    "type": "webhook.deliver",
    "payload": {
      "url": "https://example.com/webhook",
      "method": "POST",
      "body": { "event": "user.created" }
    },
    "idempotencyKey": "user-created-123"
  }'
```

Expected response:

```json
{
  "id": "<job-id>",
  "status": "PENDING",
  "createdAt": "2026-10-10T00:00:00.000Z"
}
```

## 8. Check the job status

```bash
curl http://localhost:3000/v1/jobs/<job-id> \
  -H "x-api-key: demo-secret-key"
```

## 9. List jobs

```bash
curl "http://localhost:3000/v1/jobs?status=PENDING&limit=20" \
  -H "x-api-key: demo-secret-key"
```

## 10. Best practices

- always include a unique idempotency key for each logical operation
- do not reuse the same key with a different payload
- keep job payloads small and serializable
- prefer job types that map to clear business actions
- monitor /health/ready during deployment and operations

## 11. Common job types

- webhook.deliver
- email.send

You can extend the job type enum to support more workflows.

## 12. Integration tips

Use Relay when:

- the request should return quickly
- work can be retried safely
- a downstream system may fail transiently
- you want durable async processing without blocking the API request
