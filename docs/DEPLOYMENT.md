# Deployment Guide

## Local development

```bash
docker-compose up -d
cp .env.example .env
yarn install
yarn prisma db push
yarn start:dev
```

## Production deployment

This project is designed for containerized deployment via Docker. The repository includes:

- Dockerfile for building the runtime image
- GitHub Actions workflows for CI, release, and deploy
- health endpoints for readiness and liveness checks

### Required environment variables

- PORT
- DATABASE_URL
- DATABASE_USER
- DATABASE_PASSWORD
- DATABASE_NAME
- REDIS_HOST
- REDIS_PORT
- NODE_ENV
- API_KEY

### Production assumptions

- PostgreSQL is available and reachable from the application container.
- Redis is available and reachable from the application container.
- The runtime is run behind a trusted reverse proxy or load balancer.
- Secrets are injected through environment variables or an external secret manager.

### Production deployment pattern

1. Run CI checks on pull requests and main branch merges.
2. Build and push a versioned container image.
3. Deploy the image to a target environment.
4. Validate health endpoints and queue execution.
5. Monitor job throughput and failure rates.
