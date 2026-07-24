# Chioma Backend

NestJS REST API for the Chioma rental payment platform. Handles authentication, property listings, rent agreements, payments, Stellar blockchain integration, disputes, and KYC.

## Quick start

```bash
cd backend
pnpm install
cp .env.example .env   # configure database, JWT, Stellar contracts
pnpm run start:dev
```

The API listens on `http://localhost:5000` by default (`PORT` env).

## API documentation

| Resource                                                           | Description                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| [Interactive Swagger UI](http://localhost:5000/api/docs)           | Try endpoints in the browser (when the server is running) |
| [OpenAPI JSON](http://localhost:5000/api/docs-json)                | Machine-readable OpenAPI 3.0 spec                         |
| [Developer portal](http://localhost:5000/developer-portal)         | API key onboarding and links                              |
| [docs hub](./docs/README.md)                                       | Full documentation index                                  |
| [API overview](./docs/api/api-documentation.md)                    | Endpoint reference                                        |
| [Usage guide](./docs/api/USAGE_GUIDE.md)                           | Step-by-step integration guide                            |
| [Auth API reference](./src/modules/auth/AUTH_API_DOCUMENTATION.md) | Authentication endpoints                                  |

Generate a static OpenAPI file:

```bash
pnpm run openapi:generate   # writes openapi.json
make openapi                # same via Makefile
```

## Development commands

```bash
make ci           # Full CI pipeline (format, lint, typecheck, test, build)
make pre-commit   # Lighter check before committing
make test         # Unit tests
make test-cov     # Tests with coverage
make test-mutation # Mutation testing (Stryker)
make build        # Production build
make security-ci  # Security lint + smoke tests
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for module conventions, PR requirements, and the full command list.

## Project structure

```
backend/
├── src/
│   ├── modules/       # Feature modules (auth, properties, payments, stellar, …)
│   ├── common/        # Shared middleware, guards, DTOs
│   ├── database/      # TypeORM config, migrations, seeds
│   └── main.ts        # Bootstrap, Swagger, global pipes
├── test/              # E2E and integration tests
├── docs/              # API documentation and usage guides
├── scripts/           # OpenAPI generation, CI helpers
└── public/            # Static assets (developer portal)
```

## Observability

Every HTTP request is instrumented by `ResponseTimeInterceptor` (global `APP_INTERCEPTOR`). It records wall-clock latency — including auth, guards, and all inner middleware — and emits three signals: a Prometheus `http_request_duration_ms` Histogram (buckets 5–5000 ms) and `http_requests_total` Counter scraped by the existing Prometheus sidecar; one structured JSON log line per request (`event`, `route`, `method`, `status`, `duration_ms`, `slow`) shipped to Loki; and an in-process ring buffer queryable via `GET /api/performance/response-times` (admin auth required). Requests exceeding `RESPONSE_TIME_SLOW_THRESHOLD_MS` (default 500 ms) additionally emit a structured WARN log. See [`docs/response-time-tracking.md`](./docs/response-time-tracking.md) for the full ADR, Prometheus queries, and log aggregator query patterns.

## Health checks

| Endpoint               | Description                             |
| ---------------------- | --------------------------------------- |
| `GET /health`          | Liveness (database + Stellar status)    |
| `GET /health/detailed` | Extended metrics (memory, node version) |
| `GET /api`             | Simple system status                    |

## CI/CD

GitHub Actions workflows:

- [`.github/workflows/backend-ci-cd.yml`](../.github/workflows/backend-ci-cd.yml) for release-oriented CI/CD (lint, test, build, Docker, deploy).
- [`.github/workflows/backend-tests.yml`](../.github/workflows/backend-tests.yml) for continuous testing (PRs, pushes, and scheduled runs every 6 hours).

PRs touching `backend/**` run: ESLint → Prettier → TypeScript → unit tests → coverage → build.

Run the same checks locally before pushing:

```bash
make ci
```
