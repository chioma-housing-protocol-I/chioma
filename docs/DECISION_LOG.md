# Architecture Decision Log

A chronological, at-a-glance index of the project's significant architectural
decisions. Each entry links to the full [ADR](adr/) with its context,
alternatives considered, and consequences; this page exists so you don't have
to open every file to see *what* was decided and *why*, before diving into
the one you actually need.

See [`docs/adr/README.md`](adr/README.md) for the ADR process itself (when to
write one, the template, how to propose a change).

## Index

| ADR | Decision | Why | Revisit when |
|---|---|---|---|
| [0001](adr/0001-nestjs-modular-monolith.md) | Single NestJS app, feature modules under `backend/src/modules/*`, in-process Bull queues | Many interdependent domains (auth, properties, agreements, payments, escrow, disputes), small team, shared database and cross-cutting concerns (auth, auditing, rate limiting) | A single module's resource needs (scaling, deploy cadence, team ownership) diverge sharply from the rest of the app |
| [0002](adr/0002-typeorm.md) | PostgreSQL via TypeORM, decorator entities, explicit migrations, `synchronize` never enabled outside local dev | Need a relational store for agreements/payments/audit data with first-class NestJS integration and safe migrations | TypeORM's migration or query-builder limitations start blocking a feature, or query performance can't be tuned through it |
| [0003](adr/0003-elasticsearch-search.md) | Elasticsearch as a secondary, Postgres-sourced search index for property discovery; falls back to DB queries if unavailable | Full-text search, fuzzy matching, faceting, and geo queries at a latency Postgres `LIKE` can't sustain as listings grow | Listing volume or query patterns outgrow Elasticsearch's current indexing/cost profile, or a managed search service becomes a better fit |
| [0004 (soroban)](adr/0004-soroban-multi-contract.md) | Eight separate Soroban contracts (agreements, escrow, payment, rent obligation, dispute resolution, property registry, agent registry, user profile) calling each other cross-contract | On-chain logic spans many domains; Soroban contracts have size limits, and upgrade/audit risk grows with contract size | Cross-contract call overhead or audit burden across 8 contracts becomes the bottleneck, or Soroban's size limits change |
| [0005](adr/0005-zustand-react-query.md) | React Query owns server state (fetch/cache/invalidate); Zustand owns small global client-only state | The frontend has two distinct kinds of state with different lifecycles (server data vs. UI/session state), and conflating them in one store was getting unwieldy | A single state layer (e.g. a future framework-level data layer) can cleanly replace both without regressing either concern |
| [0001 (legacy numbering)](adr/ADR-0001-monolithic-architecture.md) | Modular monolith, single deployable NestJS app with separated domain modules | Same rationale as ADR 0001 above | **Note:** this file and [`0001-nestjs-modular-monolith.md`](adr/0001-nestjs-modular-monolith.md) cover the same decision under two numbering schemes (`ADR-000N` vs `000N-slug`). Not resolved here as it's outside this issue's scope; worth consolidating into one ADR in a follow-up. |
| [0004 (auth)](adr/ADR-0004-dual-authentication.md) | Dual authentication: JWT (email/password) and Stellar SEP-0010 (wallet-based) | Chioma targets two distinct user segments with different auth expectations (traditional login vs. wallet-native) | SEP-0010 or JWT's threat model changes, or one auth path is deprecated |

## Lessons so far

- **Numbering drifted** between an early `ADR-000N-slug.md` convention and a
  later `000N-slug.md` convention (see the 0001/0001 duplicate above). Pick
  one convention and enforce it, e.g. via the PR template or a lint check, to
  avoid this recurring.
- **The modular monolith (0001) is a standing bet against splitting into
  services.** Every subsequent ADR (TypeORM, Elasticsearch, Soroban
  contracts) was written assuming a single deployable backend; revisiting
  0001 would likely force re-litigating several of the others.
