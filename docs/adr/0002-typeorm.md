# 0002. TypeORM with PostgreSQL

- **Status**: Accepted
- **Date**: 2026-09-25

## Context

We need a relational store for agreements, payments, and audit data, with migrations and first-class NestJS integration.

## Decision

PostgreSQL accessed through TypeORM (`@nestjs/typeorm`), with decorator-based entities (`*.entity.ts`) and explicit migrations in `backend/migrations/`. `synchronize` is never enabled outside local development.

## Alternatives considered

- **Prisma** — rejected: separate schema language and generated client sit awkwardly with Nest DI and per-module entity ownership; weaker support for some Postgres features we use (enums, jsonb querying) at the time of the decision.
- **MikroORM** — rejected: smaller ecosystem and less team familiarity.
- **Raw SQL / Knex** — rejected: too much boilerplate for the number of entities.
- **MongoDB** — rejected: financial records need relational integrity and transactions.

## Consequences

- Entities live next to the module that owns them.
- Every schema change needs a migration (see `docs/database-migration-standards.md`).
- TypeORM's lazy relations and query builder need care to avoid N+1 queries.
