# Architecture Guide

## Overview

Relay is a distributed asynchronous job platform built around a transactional outbox, persistent job tracking, and Redis-backed worker execution.

## System flow

1. Client submits job through the REST API.
2. API validates request and checks idempotency.
3. Job and outbox event are written in a single database transaction.
4. Outbox poller dispatches pending events to BullMQ.
5. Workers consume jobs and persist results and attempts.
6. Job lifecycle status is stored in PostgreSQL for observability and auditing.

## Main components

### API layer

The NestJS API layer exposes versioned endpoints, validation, and authentication.

### Job domain

Jobs are persisted in PostgreSQL with idempotency keys, payloads, attempts, and lifecycle state.

### Outbox pattern

Outbox rows represent published integration events. They are processed asynchronously and reliably dispatched to BullMQ.

### Queue workers

BullMQ workers process tasks and update job progress or final state in the database.

### Persistence and observability

PostgreSQL stores durable state. Redis provides job queues and reliability primitives. Health checks and logs provide operational signals.

## Design goals

- durable job state
- at-least-once dispatch semantics
- idempotent submission
- retry and dead-letter handling
- observable workflows
