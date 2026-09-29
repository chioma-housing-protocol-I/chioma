# Architecture Decision Records

This directory records the major structural decisions behind Chioma, including the alternatives that were rejected, so they don't get re-litigated.

## Policy

**Any new structural decision requires an ADR**, added in the same PR that introduces it. "Structural" means: a new framework, datastore, or external service; a new deployable or contract; a change to module boundaries; or reversing an existing ADR.

1. Copy `0000-template.md` to `NNNN-short-title.md` using the next number.
2. Fill in Context, Decision, Alternatives considered, and Consequences.
3. Never edit an accepted ADR's decision — supersede it with a new ADR and set the old one's status to `Superseded by NNNN`.

## Index

| #                                       | Decision                                | Status   |
| --------------------------------------- | --------------------------------------- | -------- |
| [0001](0001-nestjs-modular-monolith.md) | NestJS modular monolith for the backend | Accepted |
| [0002](0002-typeorm.md)                 | TypeORM with PostgreSQL                 | Accepted |
| [0003](0003-elasticsearch-search.md)    | Elasticsearch for property search       | Accepted |
| [0004](0004-soroban-multi-contract.md)  | Soroban split across eight contracts    | Accepted |
| [0005](0005-zustand-react-query.md)     | Zustand + React Query for client state  | Accepted |
