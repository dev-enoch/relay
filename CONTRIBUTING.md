# Contributing

Thank you for your interest in contributing to Relay.

## Development setup

1. Install Node.js 20+.
2. Install Yarn 1.x.
3. Start dependencies:
   ```bash
   docker-compose up -d
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
5. Install dependencies:
   ```bash
   yarn install
   ```
6. Sync the database schema:
   ```bash
   yarn prisma db push
   ```
7. Run the app in development mode:
   ```bash
   yarn start:dev
   ```

## Quality gates

Before opening a pull request, run:

```bash
yarn test
yarn test:e2e
yarn build
```

## Branching

- Use a short-lived feature branch for changes.
- Keep changes scoped and easy to review.
- Prefer clear commit messages.

## Pull requests

- Include a summary of what changed and why.
- Call out any risk, migration, or deployment implications.
- Ensure all validation steps pass before requesting review.

## Code standards

- Prefer TypeScript type safety.
- Follow existing NestJS patterns.
- Keep business logic explicit and observable.
- Add or update tests for behavior changes.

## Reporting issues

Open an issue with:

- environment details
- reproduction steps
- expected behavior
- actual behavior
- logs or screen captures when helpful
