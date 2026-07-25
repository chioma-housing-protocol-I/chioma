# Architecture Decisions and Trade-offs

This document captures the key architecture decisions made for the Chioma backend, along with the rationale, alternatives considered, and trade-offs accepted for each.

## Table of Contents

- [Modular Monolith over Microservices](#modular-monolith-over-microservices)
- [NestJS Framework](#nestjs-framework)
- [PostgreSQL with TypeORM](#postgresql-with-typeorm)
- [Dual Authentication: JWT + Stellar SEP-0010](#dual-authentication-jwt--stellar-sep-0010)
- [Bull Queues with Redis for Async Processing](#bull-queues-with-redis-for-async-processing)
- [Redis/Upstash for Caching](#redisupstash-for-caching)
- [Monorepo Structure](#monorepo-structure)
- [URI-based API Versioning](#uri-based-api-versioning)
- [AES-256-GCM Field-Level Encryption](#aes-256-gcm-field-level-encryption)
- [Stellar Blockchain Integration via SDK](#stellar-blockchain-integration-via-sdk)
- [Global ValidationPipe with Whitelisting](#global-validationpipe-with-whitelisting)
- [Event-Driven Audit and Security Logging](#event-driven-audit-and-security-logging)
- [Separate Worker Processes for Queue Processing](#separate-worker-processes-for-queue-processing)
- [Monitoring Stack: Prometheus + Grafana + Loki](#monitoring-stack-prometheus--grafana--loki)

---

## Modular Monolith over Microservices

### Decision

The backend is implemented as a NestJS modular monolith — a single deployable service with clearly separated domain modules.

### Status

Accepted (maintained since project inception)

### Context

The Chioma platform manages rental agreements, payments, escrow, property listings, blockchain transactions, and user management — domains that share a unified data model and transactional boundaries.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Microservices (per domain) | Premature complexity for the team size; added overhead for distributed transactions, service discovery, and inter-service communication |
| Serverless functions (AWS Lambda) | Cold starts, state management complexity, and poor fit for long-lived blockchain operations |
| Monolithic (no module boundaries) | Risk of uncontrolled coupling; no enforcement of domain separation |

### Trade-offs

- **For**: Simpler deployment, single codebase to navigate, shared TypeORM entities and transactions, easier end-to-end testing, lower operational overhead
- **Against**: Horizontal scaling means scaling the entire service even if only one domain is under load; risk of module boundary erosion without disciplined code review; single-point-of-deployment coupling all domains

### Mitigation

- Clear module boundaries enforced via NestJS module imports (no circular dependencies — see [Dependency Graph](./DEPENDENCY_GRAPH.md))
- Background jobs offloaded to Bull queues to keep the request path lean
- Stateless design allows horizontal scaling behind a load balancer

### Related Decisions

- [Bull Queues with Redis for Async Processing](#bull-queues-with-redis-for-async-processing)

---

## NestJS Framework

### Decision

NestJS (with Express under the hood) is the application framework.

### Status

Accepted

### Context

The team needed a structured, opinionated framework for building maintainable server-side applications with TypeScript.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Express (bare) | No built-in module system, dependency injection, or guard/middleware framework — leads to ad-hoc organisation |
| Fastify | Faster runtime, but smaller ecosystem; fewer community resources for NestJS-style decorators and providers |
| LoopBack | Heavy ORM coupling and code generation; less flexibility for Stellar/blockchain integrations |

### Trade-offs

- **For**: Decorator-based module definition (controllers, services, guards), built-in DI with scoped providers, pipeline architecture (guards → interceptors → pipes → handlers), mature ecosystem with OpenAPI/Swagger support, excellent TypeScript support
- **Against**: Higher abstraction overhead vs. bare Express; opinionated structure can feel restrictive; decorators are experimental TC39 proposals; learning curve for new team members

### Mitigation

- Strict code review standards ensure consistent use of NestJS patterns
- All modules follow the same structural conventions
- Comprehensive documentation guides new contributors

---

## PostgreSQL with TypeORM

### Decision

PostgreSQL is the primary database, accessed through the TypeORM ORM.

### Status

Accepted

### Context

The application requires ACID compliance for financial transactions (payments, escrow, agreements), geospatial queries for property search, and JSONB for flexible attribute storage.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| MongoDB | No native ACID across documents (pre-v4.0); weaker geospatial indexing; no JOINs for relational queries |
| Prisma | Cleaner API but less control over raw queries; migration tooling was less mature at decision time; additional build step |
| Knex.js | Query builder only — no entity mapping, no lazy loading, no repository pattern |
| Raw SQL (pg driver) | Maximum control but no schema validation, no migration tooling, no entity mapping |

### Trade-offs

- **For**: Mature ORM with migration system, decorator-based entity definitions, repository pattern, PostgreSQL-specific features (JSONB, GiST indexes, `pg_stat_statements`)
- **Against**: TypeORM's lazy loading can lead to N+1 query issues if not carefully managed; eager relations complicate query performance; migration generation from entity changes can produce unexpected diffs; performance overhead vs. raw queries

### Mitigation

- Strict code review catches N+1 patterns
- Query optimisation with `EXPLAIN ANALYZE` for hot paths
- Explicit relation loading (`FindOptionsRelations`) instead of relying on defaults
- See [Performance Indexes](../database/PERFORMANCE_INDEXES.md) and [Scalability & Performance](./scalability-and-performance.md)

---

## Dual Authentication: JWT + Stellar SEP-0010

### Decision

The platform supports two authentication methods: email/password with JWT tokens and Stellar SEP-0010 wallet-based authentication.

### Status

Accepted

### Context

Chioma targets both traditional web users (email/password) and blockchain-native users (Stellar wallets). Both must authenticate to the same API.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Email/password only | Excludes Stellar wallet users from native blockchain features |
| Stellar SEP-0010 only | Excludes traditional web users who may not have a Stellar wallet |
| OAuth 2.0 / OpenID Connect | Additional complexity; no built-in Stellar integration |

### Trade-offs

- **For**: Dual auth supports both user segments; JWT is fast and well-understood; SEP-0010 provides cryptographic proof of wallet ownership; unified token format simplifies guard logic
- **Against**: Two code paths for authentication increase surface area for bugs; JWTs require careful secret management and rotation; SEP-0010 challenge/response adds latency to wallet login; token revocation requires a blocklist or short expiry

### Mitigation

- Shared `JwtAuthGuard` with strategy selection based on request metadata
- Short access token TTL (15 minutes) with refresh token rotation
- Immediate token invalidation on password change or security event
- See [Authentication Documentation](../AUTHENTICATION.md)

---

## Bull Queues with Redis for Async Processing

### Decision

Background jobs (email notifications, blockchain submissions, data sync, document processing) are managed through Bull queues backed by Redis.

### Status

Accepted

### Context

Several operations should not block the HTTP response: sending emails, submitting Stellar transactions, syncing with external providers, processing uploaded documents.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| In-process `setTimeout` / `setImmediate` | No persistence; lost on crash; no retry mechanism; no monitoring |
| AWS SQS / RabbitMQ | Additional infrastructure dependency; not already in the stack; paid service |
| Bull (with ioredis) | Redis was already required for caching; mature queue semantics with built-in retry, backoff, and job monitoring |

### Trade-offs

- **For**: Job persistence across restarts; automatic retry with exponential backoff; job deduplication; Bull Board provides a web UI for monitoring; worker processes can scale independently; dead-letter tracking for failed jobs
- **Against**: Redis is a single point of failure for queue operations (mitigated by Upstash managed Redis in production); jobs are eventually consistent by design; queue backlog can grow if workers are under-provisioned; no built-in support for scheduled/cron jobs (requires external scheduler)

### Mitigation

- Redis connection configured with retry logic and sentinel/cluster support
- Monitoring alerts for queue depth and failed job rates
- Separate worker deployment for independent scaling
- See [Bull Queues Implementation](../queues/BULL_QUEUES_IMPLEMENTATION.md)

---

## Redis/Upstash for Caching

### Decision

Redis (local development) or Upstash (production) provides a distributed cache layer.

### Status

Accepted

### Context

Read-heavy endpoints (property listings, user profiles, static reference data) benefit from caching to reduce database load and improve response times.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| In-memory cache (Node.js Map) | Not shared across instances; lost on restart; no eviction policy |
| Memcached | Simpler but no built-in data structures; less ecosystem support |
| CDN caching (Cloudflare, CloudFront) | Only effective for cacheable GET responses; no server-side control |

### Trade-offs

- **For**: Redis data structures (hashes, sets, sorted sets) support complex caching patterns; Upstash provides a serverless Redis compatible API without managing infrastructure; TTL-based invalidation is simple and predictable; shared across all API instances
- **Against**: Cache invalidation must be handled manually on data mutation; Upstash REST API has higher latency than direct Redis protocol; cache falls back to database queries on miss — stale data is possible during TTL windows; additional cost for managed Redis

### Mitigation

- Event-driven cache invalidation on entity mutations
- Conservative TTLs (30–300 seconds depending on data volatility)
- Cache monitoring dashboards for hit-rate tracking
- Graceful fallback to database queries if Redis is unavailable
- See [Caching Strategy](../caching/CACHING_STRATEGY.md)

---

## Monorepo Structure

### Decision

The entire Chioma platform — backend, frontend, smart contracts — lives in a single monorepo.

### Status

Accepted

### Context

Three teams (backend, frontend, smart contracts) collaborate on a single product. Changes often span multiple packages.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Multi-repo (separate repos per component) | Coordinating cross-cutting changes requires multiple PRs; version drift between API and frontend; harder onboarding |
| Monorepo with Lerna | Additional tooling; less active maintenance |
| Monorepo with pnpm workspaces | Native workspace support; fast installs; strict dependency isolation |

### Trade-offs

- **For**: Single `git clone` for the full stack; atomic commits across packages; shared CI configuration; consistent tooling (pnpm, ESLint, Prettier); easier to enforce cross-cutting concerns
- **Against**: Larger `git clone` and `pnpm install` times; CI must intelligently scope runs to affected packages; risk of unintended cross-package coupling; requires discipline to enforce boundary rules

### Mitigation

- pnpm workspace configuration restricts cross-package imports
- CI pipelines use `--filter` to scope build and test execution
- Clear directory structure separates concerns: `frontend/`, `backend/`, `contract/`

---

## URI-based API Versioning

### Decision

API versions are indicated in the URI path: `/api/v1/properties`.

### Status

Accepted

### Context

The public API will evolve over time. Breaking changes must be communicated and managed without disrupting existing clients.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Header-based versioning (Accept header) | More RESTful but invisible in URLs — harder to debug, cache, and document |
| Query parameter versioning (`?v=1`) | Easy to forget; no clear cache key separation |
| No versioning | Impossible to evolve the API without breaking existing clients |

### Trade-offs

- **For**: Explicit and visible in every request; cache-friendly (different URLs = different cache keys); easy to route in load balancers; intuitive for API consumers; straightforward deprecation per version
- **Against**: URL duplication across versions; encourages code duplication if versions diverge significantly; version sprawl if old versions are never deprecated

### Mitigation

- Semantic versioning for the API (breaking changes → new major version)
- Deprecated versions receive security fixes only
- Deprecation policy: 6-month notice before removal
- See [API Versioning](../api/API-VERSIONING.md)

---

## AES-256-GCM Field-Level Encryption

### Decision

Sensitive fields (PII, financial data) are encrypted at the application level using AES-256-GCM before being stored in PostgreSQL.

### Status

Accepted

### Context

Regulatory compliance (GDPR, CCPA, FCRA) requires protection of personally identifiable information and financial data. Column-level encryption provides defence-in-depth beyond database encryption at rest.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| PostgreSQL `pgcrypto` extension | Ties encryption to the database; harder to rotate keys; no application-level access control |
| Transit encryption only (TLS) | No protection for data at rest; no protection from database-level breach |
| HSM / cloud KMS (AWS KMS) | Additional cost and latency; dependency on cloud provider; more complex key rotation |

### Trade-offs

- **For**: Data is encrypted before it reaches the database; key rotation is handled at the application layer; searchable encryption patterns (last 4 digits of SSN, email hash) can be added selectively; AES-256-GCM provides authenticated encryption
- **Against**: Cannot query encrypted fields directly in SQL; more complex read/write paths; key management burden; slightly higher CPU usage for encrypt/decrypt; prevents database-level indexing on encrypted columns

### Mitigation

- TypeORM entity subscribers for transparent encrypt/decrypt
- Key rotation with multiple active keys (newest for encrypt, all for decrypt)
- Dedicated encryption key per environment
- See [Encryption Documentation](../encryption.md) and [Secrets Management](../security/SECRETS_MANAGEMENT.md)

---

## Stellar Blockchain Integration via SDK

### Decision

Blockchain operations use the Stellar SDK to interact directly with the Stellar network rather than going through a middleware service.

### Status

Accepted

### Context

The platform uses Stellar for escrow contracts, rent obligation NFTs, property registration, and payment processing. These require direct network interaction.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Third-party blockchain middleware (e.g., Alchemy, Infura for Stellar) | Additional cost; dependency on third-party availability; less control over transaction building |
| Custom Stellar node | Operational overhead of running and maintaining a Stellar node; not justified for current transaction volume |
| Soroban CLI for every operation | Not suitable for programmatic/automated operations; no TypeScript SDK |

### Trade-offs

- **For**: Full control over transaction building and submission; no additional middleware cost; TypeScript types from the SDK; direct visibility into network responses; custom retry and error handling
- **Against**: Direct dependency on Stellar network availability; SDK updates require coordinated upgrades; transaction fee estimation must be handled in application code; no abstraction layer between the application and the blockchain

### Mitigation

- All blockchain operations are queued through Bull for retry resilience
- Configurable fallback Horizon endpoints
- Comprehensive error handling for network failures and transaction failures
- See [Blockchain Integration Guide](../blockchain/BLOCKCHAIN-INTEGRATION-GUIDE.md)

---

## Global ValidationPipe with Whitelisting

### Decision

A global `ValidationPipe` is configured with `whitelist: true` and `forbidNonWhitelisted: true` to strip unknown properties and reject invalid requests.

### Status

Accepted

### Context

API security and data integrity require strict validation of all incoming request payloads.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Manual validation in each controller method | Duplication; easy to miss edge cases; inconsistent error responses |
| No validation | Security risk; data corruption from unexpected inputs |
| Joi schemas per route | More explicit schema definitions but additional library dependency; decorator-based validation is more idiomatic in NestJS |

### Trade-offs

- **For**: Consistent validation across all endpoints; automatic DTO transformation; class-validator decorators provide self-documenting schemas visible in Swagger; injection attempt mitigation via property stripping
- **Against**: Debugging transform errors can be tricky; custom validation decorators needed for complex cross-field validation; disableErrorMessages in production makes debugging harder for operators

### Mitigation

- Sensible error messages in non-production environments
- Custom decorators for reusable cross-field validation
- DTOs as single source of truth for request shape
- See [Error Handling](../ERROR_HANDLING.md)

---

## Event-Driven Audit and Security Logging

### Decision

Privileged operations and security events are recorded in dedicated `audit_logs`, `security_events`, and `threat_events` tables via event-driven services.

### Status

Accepted

### Context

Compliance requirements (GDPR, financial regulations) demand immutable audit trails. Security monitoring requires real-time event analysis and alerting.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Logging to file only | Hard to search, no relational queries, no real-time alerting |
| Dedicated audit service (e.g., AWS CloudTrail) | External dependency; additional cost; limited to AWS operations |
| Database trigger-based logging | Couples audit to schema; harder to evolve; no application context |

### Trade-offs

- **For**: Structured, queryable audit data in PostgreSQL; relational joins with entities (user, agreement, payment); real-time security analysis via event-driven processors; immutable append-only pattern
- **Against**: Additional database write load on every audited operation; audit table growth requires partitioning and retention policies; application-level events can be bypassed if the database is written to directly; no built-in blockchain anchoring (requires additional implementation)

### Mitigation

- Audit event producers are integrated at the service layer, not the database layer
- Partitioned audit tables with automated retention cleanup
- Application-level access controls prevent unauthorised audit log modification
- See [Audit Logging](../security/AUDIT_LOGGING.md)

---

## Separate Worker Processes for Queue Processing

### Decision

Bull queue workers run in separate Node.js processes from the main API server.

### Status

Accepted

### Context

Background jobs (email delivery, blockchain submissions, data sync) can be CPU-intensive or long-running. Running them in the API process would degrade HTTP response times.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| In-process job processing | Blocks the event loop; no independent scaling; harder to isolate failures |
| Dedicated worker service (separate deployment) | More operational complexity; separate Docker image |
| Th child processes (`child_process.fork`) | Manual lifecycle management; less integration with Bull's worker model |

### Trade-offs

- **For**: Workers can scale independently of API instances; job failures don't affect API availability; workers can have different resource limits (CPU/memory); separate process isolation prevents memory leaks in workers from affecting the API
- **Against**: Additional deployment complexity; higher total memory usage (each worker process loads the application); inter-process communication for job results requires Redis pub/sub or database polling; worker configuration must be kept in sync with the API

### Mitigation

- Workers use the same codebase (shared module imports) with a different entry point
- Docker Compose defines separate services for `api` and `workers`
- Environment variables control which queues each worker process handles
- See [Bull Queues Implementation](../queues/BULL_QUEUES_IMPLEMENTATION.md)

---

## Monitoring Stack: Prometheus + Grafana + Loki

### Decision

Self-hosted monitoring uses Prometheus (metrics), Grafana (dashboards), and Loki (log aggregation) with Alertmanager for alerting.

### Status

Accepted

### Context

Production observability requires metrics collection, centralised logging, and alerting. The platform also uses Sentry for error tracking.

### Alternatives Considered

| Alternative | Reason Against |
|---|---|
| Datadog | Excellent product but higher cost for the team's budget |
| New Relic | APM-focused; less flexible dashboarding than Grafana |
| ELK stack (Elasticsearch, Logstash, Kibana) | Heavier resource footprint than Loki; more complex configuration; higher operational overhead |
| CloudWatch (AWS) | Ties monitoring to AWS; limited dashboarding capabilities; higher cost at scale |

### Trade-offs

- **For**: Full control over the monitoring stack; no per-node or per-event cost; Loki is purpose-built for log aggregation with Prometheus integration; Grafana provides unified dashboards for metrics and logs; Alertmanager supports flexible routing, deduplication, and silencing
- **Against**: Requires maintaining the monitoring infrastructure (Docker Compose monitoring stack); self-hosted monitoring is a single point of failure for observability; Prometheus pull model requires network access to all targets; Loki query performance degrades with very high log volumes without proper configuration

### Mitigation

- Docker Compose monitoring stack defined in `docker-compose.monitoring.yml`
- Prometheus metrics exported from the application via `@willsoto/nestjs-prometheus`
- Structured JSON logging ensures compatibility with Loki's log parsing
- See [Logging and Monitoring](../LOGGING_AND_MONITORING.md) and [Comprehensive Monitoring](../COMPREHENSIVE_MONITORING.md)
