# 0001. NestJS modular monolith for the backend

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

The backend covers many domains (auth, properties, agreements, payments, escrow, disputes, maintenance, notifications, KYC, search). The team is small and the domains share one database and many cross-cutting concerns (auth guards, auditing, rate limiting, Stellar integration).

## Decision

A single NestJS application organised as feature modules under `backend/src/modules/*`. Each module owns its entities, services, and controllers and exposes only what it exports. Background work runs in-process via Bull queues (`modules/queues`).

## Alternatives considered

- **Microservices** — rejected: operational overhead (service discovery, distributed transactions across payments/escrow, multiple deploys) outweighs benefit at current scale.
- **Express/Fastify without a framework** — rejected: we would rebuild DI, guards, pipes, validation, and OpenAPI generation that NestJS provides.
- **Serverless functions** — rejected: long-running Stellar/Soroban calls and queue workers fit poorly; cold starts hurt API latency.

## Consequences

- One deploy, one database transaction boundary, simple local development.
- Module boundaries are enforced by convention, not the network — circular imports (`forwardRef`) are a smell to watch.
- A module can later be extracted into a service if its scaling profile diverges.
