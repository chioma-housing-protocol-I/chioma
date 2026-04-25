# Chioma Backend Documentation

Welcome to the Chioma backend documentation hub. This index covers all aspects of the NestJS API service, from local setup to production operations.

---

## Navigation

| Category                                        | Description                                      |
| ----------------------------------------------- | ------------------------------------------------ |
| [Getting Started](#getting-started)             | Prerequisites, local setup, environment config   |
| [API Reference](#api-reference)                 | Endpoint docs, standards, versioning, changelog  |
| [Architecture](#architecture)                   | System design, dependency graph, performance     |
| [Database](#database)                           | Schema, migrations, indexes                      |
| [Blockchain](#blockchain)                       | Stellar integration, anchor, SEP-0010 auth       |
| [Authentication](#authentication)               | JWT, Stellar auth, MFA, guards, security         |
| [Caching](#caching)                             | Redis/Upstash strategy, invalidation, monitoring |
| [Queues](#queues)                               | Bull queue implementation                        |
| [Deployment](#deployment)                       | Production setup, Docker, CI/CD                  |
| [Error Handling](#error-handling)               | Exception filters, error types, error responses  |
| [Logging & Monitoring](#logging--monitoring)    | Logging, Prometheus, Grafana, Sentry, alerts     |
| [Security](#security)                           | Encryption, threat model, compliance             |
| [Dependency Management](#dependency-management) | Package strategy, auditing, security updates     |
| [Integrations](#integrations)                   | Third-party services                             |
| [Support](#support)                             | Support procedures, SLAs, maintenance schedules  |
| [Incident Response](#incident-response)         | Incident classification, escalation, runbooks    |
| [Community](#community)                         | Contributing, code of conduct, team policies     |

---

## Getting Started

| Document                                               | Summary                                    |
| ------------------------------------------------------ | ------------------------------------------ |
| [Quick Start](./setup/QUICK_START.md)                  | Run the backend locally in under 5 minutes |
| [Demo Credentials](./setup/DEMO_CREDENTIALS.md)        | Pre-seeded accounts for local testing      |
| [Demo Login](./setup/DEMO_LOGIN.md)                    | Step-by-step demo login guide              |
| [Neon DB Credentials](./setup/GET_NEON_CREDENTIALS.md) | Connect to Neon serverless PostgreSQL      |
| [Seeding](./setup/SEEDING_COMPLETE.md)                 | Seed scripts and initial data              |

**Quickest path to running locally:**

```bash
# Clone and install
cd backend
pnpm install

# Copy env and configure
cp .env.example .env.development

# Start services
docker-compose up -d

# Run migrations and seed
pnpm run migration:run
pnpm run seed:admin
```

The API will be available at `http://localhost:5000/api` and Swagger UI at `http://localhost:5000/api/docs`.

---

## API Reference

| Document                                                        | Summary                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [API Overview](./api/api-documentation.md)                      | Base URL, auth, all endpoint groups                       |
| [API Standards](./api/API-STANDARDS.md)                         | Annotation conventions, request/response formats          |
| [Documentation Standards](./DOCUMENTATION-STANDARDS.md)         | README, code comments, API docs, architecture standards   |
| [Authentication Guide](./api/AUTHENTICATION.md)                 | JWT flow, SEP-0010, refresh tokens                        |
| [Error Codes](./api/ERROR-CODES.md)                             | All error codes, HTTP status mapping, examples            |
| [Rate Limiting](./api/RATE-LIMITING.md)                         | Limits, quotas, headers, retry guidance                   |
| [Pagination](./api/PAGINATION.md)                               | Cursor and offset pagination standards                    |
| [API Versioning](./api/API-VERSIONING.md)                       | URI versioning strategy and deprecation policy            |
| [API Changelog](./api/API-CHANGELOG.md)                         | History of breaking and non-breaking changes              |
| [SDK Generation](./api/SDK-GENERATION.md)                       | Auto-generate client SDKs from OpenAPI spec               |
| [Webhook Verification](./api/WEBHOOK_SIGNATURE_VERIFICATION.md) | Validate incoming webhook payloads                        |
| [Webhook Management](./api/WEBHOOK-MANAGEMENT.md)               | Webhook registration, events, payloads, retries, security |

**Swagger UI** is served at `/api/docs` and is auto-generated from NestJS `@ApiProperty` / `@ApiOperation` decorators — it always reflects the current codebase.

---

## Architecture

| Document                                                                   | Summary                                       |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| [Dependency Graph](./architecture/DEPENDENCY_GRAPH.md)                     | Module dependency overview                    |
| [Architecture Documentation](./architecture/ARCHITECTURE_DOCUMENTATION.md) | System architecture, layers, integrations     |
| [Scalability & Performance](./architecture/scalability-and-performance.md) | Horizontal scaling, caching layers, DB tuning |

**Key design decisions:**

- NestJS modular monolith with domain-scoped modules (`auth`, `agreements`, `payments`, …)
- URI-based API versioning (`/api/v1/...`); `defaultVersion: '1'`
- JWT + Stellar SEP-0010 dual auth
- TypeORM + PostgreSQL (Neon serverless in production)
- Bull queues via Redis for async jobs

---

## Database

| Document                                                     | Summary                                 |
| ------------------------------------------------------------ | --------------------------------------- |
| [Database Guide](./database/DATABASE_DOCUMENTATION_GUIDE.md) | Schema, migrations, backup, recovery    |
| [Performance Indexes](./database/PERFORMANCE_INDEXES.md)     | Index strategy for high-traffic queries |

Migrations live in `backend/migrations/`. Run with:

```bash
pnpm run migration:run       # apply pending migrations
pnpm run migration:revert    # roll back last migration
pnpm run migration:generate  # generate migration from entity changes
```

---

## Blockchain

| Document                                                                     | Summary                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Blockchain Integration Guide](./blockchain/BLOCKCHAIN-INTEGRATION-GUIDE.md) | SDK usage, accounts, transactions, wallets, security |
| [Stellar Auth (SEP-0010)](./blockchain/stellar-auth.md)                      | Wallet-based authentication flow                     |
| [Anchor Integration Guide](./blockchain/anchor-integration-guide.md)         | Fiat on/off-ramp via Stellar anchors                 |
| [Anchor Implementation](./blockchain/ANCHOR_IMPLEMENTATION.md)               | Internal implementation notes                        |
| [Anchor Integration](./blockchain/anchor-integration.md)                     | Additional anchor setup details                      |
| [Payment Gateway](./blockchain/payment-gateway-integration.md)               | Stellar payment processing                           |

---

## Authentication

| Document                                                | Summary                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Authentication Documentation](./AUTHENTICATION.md)     | Full architecture, JWT/Stellar flows, MFA, guards, decorators, security |
| [API Authentication Guide](./api/AUTHENTICATION.md)     | Quick API reference with request/response examples                      |
| [Stellar Auth (SEP-0010)](./blockchain/stellar-auth.md) | Wallet-based authentication flow details                                |

Chioma supports dual authentication: **JWT (email/password)** and **Stellar SEP-0010 (wallet)**. Both methods issue JWT access tokens with 15-minute lifetime and HttpOnly cookie refresh tokens with 7-day lifetime. MFA via TOTP is available for all accounts.

---

## Caching

| Document                                        | Summary                                 |
| ----------------------------------------------- | --------------------------------------- |
| [Overview](./caching/README.md)                 | Cache architecture                      |
| [Strategy](./caching/strategy.md)               | TTL policies, cache keys                |
| [Invalidation](./caching/invalidation.md)       | Cache invalidation patterns             |
| [Monitoring](./caching/monitoring.md)           | Cache hit rates and observability       |
| [Examples](./caching/examples.md)               | Code examples using `@Cached` decorator |
| [Troubleshooting](./caching/troubleshooting.md) | Common cache issues                     |

---

## Queues

| Document                                                     | Summary                         |
| ------------------------------------------------------------ | ------------------------------- |
| [Bull Queues](./queues/BULL_QUEUES_IMPLEMENTATION.md)        | Queue setup, workers, job types |
| [Implementation Summary](./queues/IMPLEMENTATION_SUMMARY.md) | Summary of queue usage          |

---

## Deployment

| Document                                                         | Summary                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Deployment Guide](./deployment/DEPLOYMENT.md)                   | Full runbook for dev/staging/prod deployments, monitoring, and rollback |
| [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)     | Pre-deploy and post-deploy safety checklist                             |
| [Production Setup](./deployment/PRODUCTION_SETUP.md)             | Environment config, secrets, health checks                              |
| [Monitoring & Alerting](./deployment/MONITORING_AND_ALERTING.md) | Metrics collection, alert configuration, dashboards, alert response     |
| [Backup & Recovery](./deployment/BACKUP_AND_RECOVERY.md)         | Backup strategies, verification, recovery procedures, testing           |
| [Release Management](./deployment/RELEASE_MANAGEMENT.md)         | Release planning, versioning, release notes, deployment, rollback       |

Docker Compose files:

- `docker-compose.yml` — local development
- `docker-compose.production.yml` — production
- `docker-compose.monitoring.yml` — Prometheus + Grafana
- `docker-compose.docs.yml` — serve docs locally

---

## Error Handling

| Document                              | Summary                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| [Error Handling](./ERROR_HANDLING.md) | Exception filters, custom errors, frontend classification, error response formats |

The `AllExceptionsFilter` catches all unhandled exceptions and maps them to standardized JSON responses. The frontend uses an `AppError` type system with error classification, user-friendly messages, and retry logic.

---

## Logging & Monitoring

| Document                                            | Summary                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| [Logging & Monitoring](./LOGGING_AND_MONITORING.md) | LoggerService, middleware, Sentry, Prometheus, Grafana, Loki, alerts |

The platform uses structured JSON logging with correlation IDs, sensitive data sanitization, and a full Prometheus + Grafana + Loki + Alertmanager monitoring stack.

---

## Security

| Document                                                                   | Summary                                   |
| -------------------------------------------------------------------------- | ----------------------------------------- |
| [Encryption](./encryption.md)                                              | Field-level encryption for sensitive data |
| [Security Policies](./security/SECURITY_POLICIES_AND_STANDARDS.md)         | Backend security controls and procedures  |
| [Authorization Guide](./security/AUTHORIZATION_DOCUMENTATION.md)           | RBAC, permissions, and access control     |
| [Tenant Screening Compliance](./compliance/TENANT_SCREENING_COMPLIANCE.md) | FCRA / compliance notes                   |

Security features active in every request:

- Helmet security headers
- CSRF token validation
- Request size limits (1 MB JSON / URL-encoded)
- Rate limiting via NestJS Throttler
- Threat detection middleware
- Audit logging for privileged operations

---

## Dependency Management

| Document                                            | Summary                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| [Dependency Management](./DEPENDENCY_MANAGEMENT.md) | Package management, version pinning, audits, updates, security |

---

## Integrations

| Document                                                                   | Summary                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [API Integration Procedures](./integrations/API_INTEGRATION_PROCEDURES.md) | Third-party API integration, webhooks, testing, error handling, monitoring |
| [Tenant Screening](./integrations/TENANT_SCREENING_PROVIDER_RESEARCH.md)   | Third-party screening providers                                            |
| [Tenant Screening Integration](./api/TENANT_SCREENING_INTEGRATION.md)      | API integration guide                                                      |

---

## Incident Response

| Document                                               | Summary                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| [Incident Response Procedures](./INCIDENT_RESPONSE.md) | Classification, detection, escalation, communication, runbooks, PIR |

---

## Community

| Document                                                          | Summary                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| [Contributing](./community/CONTRIBUTING.md)                       | How to contribute                                        |
| [Contribution Guidelines](./community/CONTRIBUTION_GUIDELINES.md) | Detailed guidelines                                      |
| [Code Review Standards](./community/CODE_REVIEW_STANDARDS.md)     | Review criteria, approvals, and feedback rules           |
| [Testing Standards](./community/TESTING_STANDARDS.md)             | Unit/integration/E2E standards and coverage requirements |
| [Code of Conduct](./community/CODE_OF_CONDUCT.md)                 | Community standards                                      |
| [Community Support](./community/COMMUNITY-SUPPORT.md)             | Where to get help                                        |
| [Team Policies](./community/TEAM_POLICIES.md)                     | Internal team standards                                  |

---

## Makefile Reference

```bash
make ci          # Full CI: install → format-check → lint → typecheck → test-cov → build
make lint        # ESLint
make typecheck   # tsc --noEmit
make test        # Jest unit tests
make test-e2e    # E2E tests (requires PostgreSQL)
make build       # Compile TypeScript
make pre-commit  # format-check + lint + typecheck + test
```
