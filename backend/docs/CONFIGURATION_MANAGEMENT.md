# Configuration Management

## Overview

This document covers configuration management for the Chioma backend across all environments. It defines environment variable standards, configuration file structure, validation procedures, environment-specific setups, secrets handling, versioning, deployment, and troubleshooting.

Use this document alongside:

- `backend/docs/security/SECRETS_MANAGEMENT.md`
- `backend/docs/deployment/PRODUCTION_SETUP.md`
- `backend/docs/deployment/DEPLOYMENT.md`
- `backend/docs/encryption.md`

---

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Validation](#validation)
- [Development Config](#development-config)
- [Staging Config](#staging-config)
- [Production Config](#production-config)
- [Secrets](#secrets)
- [Versioning](#versioning)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Configuration Checklist](#configuration-checklist)

---

## Environment Variables

### Standards

- All environment variables use `UPPER_SNAKE_CASE`.
- Every variable required at runtime must be present in `.env.example` with a placeholder value and an inline comment explaining its purpose.
- Real secret values are never committed to version control. `.env`, `.env.development`, `.env.staging`, `.env.production`, and `.env.test` are all listed in `.gitignore`.
- Boolean flags are expressed as the string `"true"` or `"false"` (e.g., `DB_SSL=true`).
- Numeric values are stored as strings and parsed with `parseInt` or `parseFloat` at the point of use.
- Duration values use milliseconds (e.g., `RATE_LIMIT_TTL=60000`).
- Size values use bytes (e.g., `MEMORY_WARNING_THRESHOLD=536870912`).

### Variable Groups

| Group | Prefix / Key Pattern | Description |
|---|---|---|
| Application | `NODE_ENV`, `PORT` | Runtime mode and server port |
| Database | `DB_*`, `DATABASE_URL` | PostgreSQL connection parameters |
| Authentication | `JWT_*`, `AUTH_*` | JWT secrets, expiry, and auth rate limits |
| Rate Limiting | `RATE_LIMIT_*` | Throttler TTL and max-request limits |
| Redis / Cache | `REDIS_*` | Redis host, port, credentials, TLS |
| Stellar / Soroban | `STELLAR_*`, `SOROBAN_*`, `*_CONTRACT_ID` | Blockchain network and contract addresses |
| Anchor | `ANCHOR_*`, `SUPPORTED_FIAT_CURRENCIES` | SEP-6/24 anchor integration |
| AWS S3 | `AWS_*` | Object storage credentials and bucket |
| IPFS / Pinata | `PINATA_*` | Decentralised file storage |
| Payment | `PAYMENT_*`, `PAYSTACK_*`, `FLUTTERWAVE_*` | Payment gateway selection and keys |
| Email | `EMAIL_*` | SMTP / Gmail service credentials |
| Frontend | `FRONTEND_URL`, `PASSWORD_RESET_URL`, `API_BASE_URL`, `CORS_ORIGINS` | Client URLs and CORS |
| Security | `SECURITY_*` | Encryption key, CSRF, session, HSTS, CSP |
| Logging | `LOG_*` | Log level, format, rotation |
| Monitoring | `SENTRY_*`, `METRICS_ENABLED`, `TRACING_ENABLED` | Error tracking and observability |
| Health | `HEALTH_CHECK_TIMEOUT`, `MEMORY_*_THRESHOLD` | Health check thresholds |
| Bull Queues | `BULL_QUEUE_*` | Job queue retry and backoff settings |
| Admin / Seed | `ADMIN_*`, `AGENT_*`, `TENANT_*`, `LANDLORD_*` | Default seed account configuration |

### Required Variables by Environment

The table below marks each variable as required (`R`), optional (`O`), or not applicable (`-`) per environment.

| Variable | Development | Staging | Production | Test |
|---|---|---|---|---|
| `NODE_ENV` | R | R | R | R |
| `PORT` | R | R | R | - |
| `DB_HOST` | R | R | R | R |
| `DB_PORT` | R | R | R | R |
| `DB_USERNAME` | R | R | R | R |
| `DB_PASSWORD` | R | R | R | R |
| `DB_NAME` | R | R | R | R |
| `DATABASE_URL` | - | - | R | - |
| `DB_SSL` | - | - | R | - |
| `JWT_SECRET` | R | R | R | R |
| `JWT_REFRESH_SECRET` | R | R | R | R |
| `JWT_EXPIRATION` | R | R | R | - |
| `JWT_REFRESH_EXPIRATION` | R | R | R | - |
| `RATE_LIMIT_TTL` | R | R | R | - |
| `RATE_LIMIT_MAX` | R | R | R | - |
| `RATE_LIMIT_AUTH_TTL` | R | R | R | - |
| `RATE_LIMIT_AUTH_MAX` | R | R | R | - |
| `RATE_LIMIT_STRICT_TTL` | R | R | R | - |
| `RATE_LIMIT_STRICT_MAX` | R | R | R | - |
| `REDIS_HOST` | R | R | - | - |
| `REDIS_PORT` | R | R | - | - |
| `REDIS_URL` | - | - | R | - |
| `REDIS_TOKEN` | - | - | R | - |
| `STELLAR_NETWORK` | R | R | R | - |
| `SOROBAN_RPC_URL` | R | R | R | - |
| `STELLAR_ADMIN_SECRET_KEY` | O | R | R | - |
| `SECURITY_ENCRYPTION_KEY` | R | R | R | R |
| `SENTRY_DSN` | O | O | R | - |
| `LOG_LEVEL` | R | R | R | - |
| `LOG_FORMAT` | O | R | R | - |
| `METRICS_ENABLED` | O | R | R | - |
| `TRACING_ENABLED` | O | R | R | - |

---

## Configuration Files

### File Inventory

| File | Purpose | Committed |
|---|---|---|
| `.env.example` | Canonical reference of all variables with placeholder values | Yes |
| `.env.development` | Local development overrides | No |
| `.env.staging` | Staging environment values (uses `${VAR}` references for secrets) | No |
| `.env.production` | Production environment values (uses `${VAR}` references for secrets) | No |
| `.env.test` | Minimal config for automated test runs | No |
| `src/app.module.ts` | NestJS `ConfigModule` bootstrap and TypeORM / Redis / Throttler wiring | Yes |
| `src/main.ts` | Application bootstrap — reads `PORT`, `CORS_ORIGINS`, `NODE_ENV`, request size limits | Yes |

### `.env.example` Structure

`.env.example` is the single source of truth for what variables exist. It is organised into labelled sections matching the variable groups above:

```dotenv
# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=simple

# Authentication Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-refresh-secret-key-minimum-32-characters
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=chioma_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
# For Upstash (serverless Redis), use these instead:
# REDIS_URL=https://your-upstash-redis-url.upstash.io
# REDIS_TOKEN=your-upstash-token

# ... (see .env.example for the full list)
```

When adding a new variable:
1. Add it to `.env.example` with a safe placeholder value and a comment.
2. Add it to the relevant environment files.
3. Update the Required Variables table in this document.

### NestJS ConfigModule

`ConfigModule` is registered globally in `AppModule` with `isGlobal: true`. This makes `ConfigService` available throughout the application without re-importing the module.

```typescript
ConfigModule.forRoot({
  isGlobal: true,
});
```

Variables are accessed via `ConfigService.get<T>('VARIABLE_NAME')` or directly via `process.env.VARIABLE_NAME` in bootstrap code that runs before the NestJS DI container is ready.

---

## Validation

### Startup Validation

`AppModule` validates rate-limit variables at construction time. If any are missing the application throws and refuses to start:

```typescript
private validateRateLimitConfig(): void {
  const required = [
    'RATE_LIMIT_TTL',
    'RATE_LIMIT_MAX',
    'RATE_LIMIT_AUTH_TTL',
    'RATE_LIMIT_AUTH_MAX',
    'RATE_LIMIT_STRICT_TTL',
    'RATE_LIMIT_STRICT_MAX',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
```

### Adding Validation for New Variables

To add startup validation for a new required variable, extend the `required` array in `validateRateLimitConfig` or create a dedicated validation method in `AppModule`. For complex validation (type checking, range checks), use a Joi or `class-validator` schema loaded via `ConfigModule.forRoot({ validationSchema })`.

Example using Joi:

```typescript
import * as Joi from 'joi';

ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'staging', 'production', 'test')
      .required(),
    PORT: Joi.number().default(3000),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    JWT_SECRET: Joi.string().min(32).required(),
    SECURITY_ENCRYPTION_KEY: Joi.string().length(64).required(),
  }),
});
```

### Request-Level Validation

All incoming request bodies are validated by a global `ValidationPipe` configured in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strip unknown properties
    forbidNonWhitelisted: true,   // reject requests with unknown properties
    transform: true,              // auto-transform payloads to DTO types
    skipMissingProperties: false,
    disableErrorMessages: isProduction, // hide details in production
  }),
);
```

### Configuration Error Handling

| Error | Cause | Resolution |
|---|---|---|
| `Missing required environment variables: X` | Variable absent at startup | Add the variable to the environment file and restart |
| `TypeError: Cannot read properties of undefined` | `parseInt(undefined)` on a missing numeric var | Ensure the variable is set; add startup validation |
| `Redis connection refused` | `REDIS_HOST` / `REDIS_PORT` incorrect or Redis not running | Verify Redis is running and credentials are correct |
| `SSL connection error` | `DB_SSL` not set or `DATABASE_URL` missing `?sslmode=require` | Add `DB_SSL=true` and append `?sslmode=require` to `DATABASE_URL` |
| `JWT malformed` | `JWT_SECRET` mismatch between token issuer and verifier | Ensure the same secret is used across all instances |

---

## Development Config

### Setup

1. Copy the example file:

   ```bash
   cp backend/.env.example backend/.env.development
   ```

2. Fill in local values. Minimum required set:

   ```dotenv
   NODE_ENV=development
   PORT=3000

   DB_HOST=localhost
   DB_PORT=5433
   DB_USERNAME=chioma_dev
   DB_PASSWORD=dev_password
   DB_NAME=chioma_dev

   JWT_SECRET=dev-jwt-secret-key-minimum-32-characters
   JWT_REFRESH_SECRET=dev-refresh-secret-key-minimum-32-characters
   JWT_EXPIRATION=15m
   JWT_REFRESH_EXPIRATION=7d

   RATE_LIMIT_TTL=60000
   RATE_LIMIT_MAX=100
   RATE_LIMIT_AUTH_TTL=60000
   RATE_LIMIT_AUTH_MAX=50
   RATE_LIMIT_STRICT_TTL=60000
   RATE_LIMIT_STRICT_MAX=20

   STELLAR_NETWORK=testnet
   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

   REDIS_HOST=localhost
   REDIS_PORT=6379

   LOG_LEVEL=debug
   SENTRY_DSN=

   SECURITY_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   ```

3. Start the local database (Docker Compose):

   ```bash
   cd backend
   docker-compose up -d postgres redis
   ```

4. Run migrations:

   ```bash
   pnpm migration:run
   ```

5. Start the server:

   ```bash
   pnpm start:dev
   ```

### Development-Specific Behaviour

- `LOG_LEVEL=debug` — verbose logging including SQL queries (`TypeORM logging: true`).
- `LOG_FORMAT=simple` — human-readable log output instead of JSON.
- `SENTRY_DSN` left empty — Sentry is disabled when no DSN is provided.
- `RATE_LIMIT_AUTH_MAX=50` — relaxed auth rate limit to avoid friction during development.
- `SECURITY_CSRF_ENABLED=false` — CSRF protection disabled for easier API testing.
- TypeORM `synchronize: false` — schema changes are applied via migrations, not auto-sync.
- Cache falls back to in-memory when `REDIS_URL` / `REDIS_TOKEN` are absent.

---

## Staging Config

### Setup

Staging uses `${VAR}` references for secrets, which are injected by the CI/CD pipeline or hosting platform at deploy time. The file itself contains only non-secret defaults.

```dotenv
NODE_ENV=staging
PORT=3000

DB_HOST=${DB_HOST}
DB_PORT=5432
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=chioma_staging

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

STELLAR_NETWORK=testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_ADMIN_SECRET_KEY=${STELLAR_ADMIN_SECRET_KEY}

REDIS_HOST=${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

LOG_LEVEL=debug
LOG_FORMAT=json
LOG_SLOW_REQUEST_THRESHOLD=500
LOG_SKIP_PATHS=/health
LOG_MAX_FILES=7d
LOG_MAX_SIZE=10m

SENTRY_DSN=${SENTRY_DSN}
METRICS_ENABLED=true

RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

SECURITY_ENCRYPTION_KEY=${SECURITY_ENCRYPTION_KEY}
```

### Staging-Specific Behaviour

- `STELLAR_NETWORK=testnet` — all blockchain operations use the Stellar testnet.
- `LOG_LEVEL=debug` — verbose logging retained for easier issue diagnosis.
- `LOG_FORMAT=json` — structured JSON logs for log aggregation tools.
- `METRICS_ENABLED=true` — metrics collection active for performance baseline.
- Database name is `chioma_staging` — isolated from development and production.
- Secrets are never stored in the file; they are injected at runtime.

---

## Production Config

### Setup

Production secrets are injected entirely via the hosting platform (Render environment variables) or AWS Secrets Manager. The `.env.production` file contains only `${VAR}` references and non-secret defaults.

Key production-only variables:

```dotenv
NODE_ENV=production
PORT=3000

# Full Neon PostgreSQL connection URL with SSL
DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}/neondb?sslmode=require
DB_SSL=true

STELLAR_NETWORK=mainnet
STELLAR_HORIZON_URL=https://horizon.stellar.org
SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org

# Upstash Redis (REST API — required for Render)
REDIS_URL=${REDIS_URL}
REDIS_TOKEN=${REDIS_TOKEN}

PAYMENT_GATEWAY=paystack

LOG_LEVEL=info
LOG_FORMAT=json
LOG_MAX_FILES=14d
LOG_MAX_SIZE=20m

SENTRY_ENVIRONMENT=production
METRICS_ENABLED=true
TRACING_ENABLED=true

SECURITY_CSRF_ENABLED=true
SECURITY_HSTS_MAX_AGE=31536000
SECURITY_CSP_ENABLED=true

CORS_CREDENTIALS=true
```

### Production-Specific Behaviour

- `STELLAR_NETWORK=mainnet` — all blockchain operations use the Stellar mainnet.
- `LOG_LEVEL=info` — debug logs suppressed; only info, warn, and error are emitted.
- `LOG_FORMAT=json` — structured JSON for log aggregation (Datadog, CloudWatch, etc.).
- `LOG_MAX_FILES=14d` — logs retained for 14 days (double the staging window).
- `SECURITY_CSRF_ENABLED=true` — CSRF protection active.
- `SECURITY_HSTS_MAX_AGE=31536000` — HSTS header enforced for one year.
- `SECURITY_CSP_ENABLED=true` — Content Security Policy header active.
- `PAYMENT_GATEWAY=paystack` — live payment gateway (not mock).
- `REDIS_URL` + `REDIS_TOKEN` — Upstash REST API used instead of ioredis for Render compatibility.
- `disableErrorMessages: true` in `ValidationPipe` — validation error details hidden from clients.
- TypeORM `logging: false` — SQL query logging disabled.
- Sentry `tracesSampleRate: 0.2` — 20% of transactions sampled for performance monitoring.

### Deploying to Render

1. Set all `${VAR}` variables in the Render dashboard under **Environment**.
2. Set build command: `pnpm install && pnpm build`
3. Set start command: `pnpm start:prod`
4. On first deploy, run migrations: `pnpm migration:run`

---

## Secrets

Secrets are environment variables whose exposure would compromise security. They must never be hardcoded, logged, or committed to version control.

### What Counts as a Secret

| Variable | Classification |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Critical |
| `SECURITY_ENCRYPTION_KEY` | Critical |
| `DB_PASSWORD`, `DATABASE_URL` | Critical |
| `STELLAR_ADMIN_SECRET_KEY`, `SERVER_STELLAR_SECRET` | Critical |
| `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` | High |
| `PINATA_JWT` | High |
| `ANCHOR_API_KEY` | High |
| `SENTRY_DSN` | Medium |
| `REDIS_PASSWORD`, `REDIS_TOKEN` | Medium |
| `EMAIL_PASSWORD` | High |
| `SECURITY_SESSION_SECRET` | High |
| `PAYMENT_METADATA_SECRET` | High |

### Storage Rules

- **Local development**: `.env.development` file, never committed. Obtain values from the team's shared vault (1Password, Bitwarden, or equivalent).
- **Staging / Production**: Injected at runtime via the hosting platform's environment variable store or AWS Secrets Manager. The `.env.staging` and `.env.production` files contain only `${VAR}` references.
- **CI/CD**: Secrets are stored as encrypted pipeline secrets and scoped to the pipeline steps that need them.

### Generating Secrets

```bash
# 32-byte hex string (suitable for JWT_SECRET, SECURITY_SESSION_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 64-character hex string (required for SECURITY_ENCRYPTION_KEY — AES-256 key)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 64-byte base64 string (alternative format)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

`SECURITY_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes) for AES-256-GCM.

For full rotation procedures and audit logging requirements, see `backend/docs/security/SECRETS_MANAGEMENT.md`.

---

## Versioning

### Approach

Configuration is versioned alongside the application code in the same Git repository. Changes to `.env.example` are tracked in version control and reviewed in pull requests.

### Rules

- Every pull request that adds, removes, or renames an environment variable must update `.env.example`.
- Breaking changes to variable names (renames, removals) must be noted in the PR description and communicated to the team before merging.
- The `.env.example` file is the authoritative changelog for configuration changes.

### Tracking Changes

Use Git history on `.env.example` to audit configuration changes:

```bash
git log --follow -p backend/.env.example
```

To see which variables changed between two releases:

```bash
git diff v1.0.0..v1.1.0 -- backend/.env.example
```

### Deprecation Process

1. Mark the variable as deprecated in `.env.example` with a comment: `# DEPRECATED: use NEW_VAR instead. Will be removed in v2.0.`
2. Keep the old variable functional for at least one release cycle.
3. Remove it in the next major version and update this document.

---

## Deployment

### Pre-Deployment Checklist

Before deploying to any environment, verify:

- [ ] All required variables for the target environment are set (see Required Variables table).
- [ ] No placeholder values (e.g., `your-secret-key`, `change_me`) remain in the environment.
- [ ] `SECURITY_ENCRYPTION_KEY` is exactly 64 hex characters.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are at least 32 characters.
- [ ] `STELLAR_NETWORK` matches the target environment (`testnet` for staging, `mainnet` for production).
- [ ] `PAYMENT_GATEWAY` is set to `paystack` (not `mock`) in production.
- [ ] `SENTRY_DSN` is set in staging and production.
- [ ] `CORS_ORIGINS` includes only the expected frontend domains.
- [ ] Database migrations have been run: `pnpm migration:run`.

### Applying Configuration Changes

**Development**: Edit `.env.development` and restart the server (`pnpm start:dev`).

**Staging / Production (Render)**:
1. Update the variable in the Render dashboard.
2. Trigger a redeploy (Render automatically restarts the service on environment variable changes).
3. Monitor logs for startup errors.

**Staging / Production (Docker)**:
1. Update the secret in the secret store.
2. Update the environment variable in the deployment manifest or `docker-compose.production.yml`.
3. Redeploy: `docker-compose -f docker-compose.production.yml up -d --force-recreate`.

### Zero-Downtime Configuration Updates

For variables that do not require a restart (e.g., feature flags read at request time), update the value in the secret store and allow the running instance to pick it up on the next read.

For variables read at startup (database credentials, JWT secrets, encryption keys), a rolling restart is required:
1. Deploy a new instance with the updated variable.
2. Wait for the new instance to pass health checks.
3. Drain and terminate the old instance.

### Rollback

To roll back a configuration change:
1. Restore the previous variable value in the secret store or hosting platform.
2. Trigger a redeploy.
3. Verify the application starts and health checks pass.

---

## Troubleshooting

### Application Fails to Start

**Symptom**: `Error: Missing required environment variables: RATE_LIMIT_TTL, ...`

**Cause**: One or more required variables are absent.

**Resolution**:
1. Compare the running environment against `.env.example`.
2. Add the missing variables.
3. Restart the application.

---

**Symptom**: `TypeError: Cannot read properties of undefined (reading 'split')`

**Cause**: A variable expected to be a string is `undefined` — typically `CORS_ORIGINS` or a similar string variable.

**Resolution**: Set the variable in the environment file. Check `main.ts` for the variable name.

---

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Cause**: Redis is not running or `REDIS_HOST` / `REDIS_PORT` are incorrect.

**Resolution**:
- Development: `docker-compose up -d redis`
- Production: Verify `REDIS_URL` and `REDIS_TOKEN` are set for Upstash.

---

**Symptom**: `Error: getaddrinfo ENOTFOUND <DB_HOST>`

**Cause**: `DB_HOST` is incorrect or the database is unreachable.

**Resolution**: Verify the host value and network connectivity. In production, confirm the Neon connection string is correct and `DB_SSL=true` is set.

---

### JWT / Authentication Errors

**Symptom**: `JsonWebTokenError: invalid signature`

**Cause**: `JWT_SECRET` differs between the token issuer and the verifier (e.g., after a secret rotation without redeploying all instances).

**Resolution**: Ensure all running instances use the same `JWT_SECRET`. After rotation, perform a rolling restart.

---

**Symptom**: `TokenExpiredError: jwt expired`

**Cause**: `JWT_EXPIRATION` is too short or the client is not refreshing tokens.

**Resolution**: Verify `JWT_EXPIRATION` (default `15m`) and `JWT_REFRESH_EXPIRATION` (default `7d`) are set correctly.

---

### Encryption Errors

**Symptom**: `Error: Invalid key length` or decryption failures after a deployment

**Cause**: `SECURITY_ENCRYPTION_KEY` is not exactly 64 hex characters, or a new key was deployed without retaining the old key for decryption fallback.

**Resolution**:
1. Verify key length: `echo -n "$SECURITY_ENCRYPTION_KEY" | wc -c` should return `64`.
2. If rotating keys, keep the old key available for decryption during the transition window. See `backend/docs/security/SECRETS_MANAGEMENT.md`.

---

### Stellar / Blockchain Errors

**Symptom**: Transactions fail with network errors in production

**Cause**: `STELLAR_NETWORK` is set to `testnet` in production, or `SOROBAN_RPC_URL` points to the testnet endpoint.

**Resolution**: Set `STELLAR_NETWORK=mainnet` and `SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org` in production.

---

### Payment Gateway Errors

**Symptom**: Payments return mock responses in production

**Cause**: `PAYMENT_GATEWAY=mock` is set in production.

**Resolution**: Set `PAYMENT_GATEWAY=paystack` and ensure `PAYSTACK_SECRET_KEY` is a live key (not a test key).

---

### Rate Limiting Misconfiguration

**Symptom**: All requests are immediately throttled

**Cause**: `RATE_LIMIT_MAX` or `RATE_LIMIT_TTL` is set to an extremely low value.

**Resolution**: Review the rate limit variables. Development defaults: `RATE_LIMIT_MAX=100`, `RATE_LIMIT_TTL=60000`. Production defaults match these values.

---

## Configuration Checklist

Use this checklist when setting up a new environment or reviewing an existing one.

### Environment Variables

- [ ] All variables in `.env.example` are accounted for in the target environment
- [ ] No placeholder values remain (e.g., `your-secret-key`, `change_me`, `<your-...>`)
- [ ] `NODE_ENV` is set to the correct value (`development`, `staging`, `production`, or `test`)
- [ ] `PORT` is set (default `3000`)

### Database

- [ ] `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` are set
- [ ] `DATABASE_URL` is set in production with `?sslmode=require`
- [ ] `DB_SSL=true` is set in production
- [ ] Migrations have been run: `pnpm migration:run`

### Authentication

- [ ] `JWT_SECRET` is at least 32 characters and randomly generated
- [ ] `JWT_REFRESH_SECRET` is at least 32 characters and different from `JWT_SECRET`
- [ ] `JWT_EXPIRATION` and `JWT_REFRESH_EXPIRATION` are set

### Security

- [ ] `SECURITY_ENCRYPTION_KEY` is exactly 64 hex characters
- [ ] `SECURITY_SESSION_SECRET` is at least 32 characters
- [ ] `SECURITY_CSRF_ENABLED=true` in staging and production
- [ ] `SECURITY_HSTS_MAX_AGE` is set in production
- [ ] `SECURITY_CSP_ENABLED=true` in production

### Rate Limiting

- [ ] All six `RATE_LIMIT_*` variables are set (required for startup)

### Redis / Cache

- [ ] Development / staging: `REDIS_HOST` and `REDIS_PORT` are set
- [ ] Production: `REDIS_URL` and `REDIS_TOKEN` are set (Upstash)

### Stellar / Blockchain

- [ ] `STELLAR_NETWORK` matches the environment (`testnet` / `mainnet`)
- [ ] `SOROBAN_RPC_URL` matches the network
- [ ] `STELLAR_ADMIN_SECRET_KEY` is set in staging and production
- [ ] All required `*_CONTRACT_ID` variables are set in production

### Payments

- [ ] `PAYMENT_GATEWAY` is `paystack` (not `mock`) in production
- [ ] `PAYSTACK_SECRET_KEY` is a live key in production
- [ ] `PAYMENT_METADATA_SECRET` is set

### Logging and Monitoring

- [ ] `LOG_LEVEL` is appropriate for the environment (`debug` in dev/staging, `info` in production)
- [ ] `LOG_FORMAT=json` in staging and production
- [ ] `SENTRY_DSN` is set in staging and production
- [ ] `METRICS_ENABLED=true` in staging and production
- [ ] `TRACING_ENABLED=true` in production

### Secrets

- [ ] No secrets are committed to version control
- [ ] `.env` files are listed in `.gitignore`
- [ ] Production secrets are stored in the hosting platform's secret store or AWS Secrets Manager
- [ ] Secret rotation schedule is documented and followed (see `backend/docs/security/SECRETS_MANAGEMENT.md`)

### CORS and Frontend

- [ ] `CORS_ORIGINS` lists only the expected frontend domains
- [ ] `FRONTEND_URL` and `PASSWORD_RESET_URL` point to the correct environment URLs
- [ ] `API_BASE_URL` is set in production
