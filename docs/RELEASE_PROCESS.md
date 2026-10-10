# Release and Deployment Process

## Release flow

1. Merge changes to the main branch.
2. CI validates the build and tests.
3. Create a git tag in the format `vX.Y.Z`.
4. The release workflow builds and pushes an image to GHCR.
5. Deploy to staging or production using the corresponding workflow.

## Production deployment

Run the workflow manually or trigger it via release completion.

Required secrets:

- PROD_SSH_HOST
- PROD_SSH_USER
- PROD_SSH_KEY
- PROD_SSH_PORT
- PROD_DATABASE_URL
- PROD_DATABASE_USER
- PROD_DATABASE_PASSWORD
- PROD_DATABASE_NAME
- PROD_REDIS_HOST
- PROD_REDIS_PORT
- PROD_API_KEY

## Staging deployment

Use the staging workflow with a tag known to exist in GHCR.

## Rollback

Use the rollback workflow to redeploy a previously known good image tag.

## Verification

After each deploy, verify:

- /health/live
- /health/ready
- successful queue processing
- no alarming job backlog increase
