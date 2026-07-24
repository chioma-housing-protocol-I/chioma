# Config Validation (Issue #1382)

## Problem

`backend/src/config/env.validation.ts` validates roughly 15 environment
variables at startup. An audit of the codebase found ~180 distinct env vars
actually referenced (`process.env.X` / `configService.get('X')`), of which
~70 are not even listed in `backend/.env.example`. A misconfigured or
incomplete deployment can currently boot successfully and fail later, at
request time, in ways that are hard to trace back to configuration.

## Goals

- Validate every environment variable the backend code actually reads.
- Fail fast (refuse to boot) in staging/production for variables that are
  unconditionally required for core app function.
- Preserve the app's existing intentional graceful-degradation behavior for
  optional/pluggable integrations (don't turn optional features into hard
  boot requirements).
- Bring `.env.example` and the two reference docs
  (`CONFIGURATION_OPTIONS.md`, `CONFIGURATION_MANAGEMENT.md`) up to date
  with reality.

## Non-goals

- Removing dead config wiring (`STELLAR_PLATFORM_SECRET_KEY`,
  `STELLAR_PLATFORM_PUBLIC_KEY`, `METRICS_ENABLED`, `TRACING_ENABLED` have
  no read sites in `src/`). Noted as a follow-up candidate, not touched here.
- Changing how any feature behaves at runtime. This is startup validation
  only.

## Architecture

Replace the imperative body of `validateEnvironment()` in
`backend/src/config/env.validation.ts` with a Joi schema, built from
`Joi.object()` fragments per variable group (app, database, JWT, redis,
encryption, stellar, contracts, payment, screening, email, security,
storage, observability, logging, monitoring, bull queues, admin/seed,
oauth2, misc) and merged with `.concat()`. The exported function keeps its
current signature — `validateEnvironment(config: Record<string, unknown>):
Record<string, unknown>` — since it's wired into
`ConfigModule.forRoot({ validate })` in `app.module.ts` and covered by
`env.validation.spec.ts`; only the internals change from hand-rolled
`if`-checks to a schema.

On validation failure, throw one `Error` whose message lists every
violation (matches current behavior — full picture in one failure, not
one-error-per-restart).

`NODE_ENV=test` keeps the existing relaxed path (only rate-limit vars
enforced), since CI/test environments intentionally run with minimal config.

## Requiredness tiers

**Tier A — always required in staging/production** (unconditional, core to
booting safely):
`NODE_ENV`, `PORT`, database group (`DATABASE_URL` or `DB_HOST`+`DB_USERNAME`+`DB_PASSWORD`+`DB_NAME`, `DB_SSL` in production), `JWT_SECRET`/`JWT_REFRESH_SECRET` (existing length/placeholder checks) + `JWT_EXPIRATION`/`JWT_REFRESH_EXPIRATION`, the six `RATE_LIMIT_*` vars, redis group (existing Upstash-vs-classic check), `ENCRYPTION_KEY_BASE64`/`ENCRYPTION_KEYS` (existing check), `SECURITY_ENCRYPTION_KEY` (existing check), `SECURITY_SESSION_SECRET`, `PAYMENT_METADATA_SECRET` (existing placeholder check), `PAYMENT_WEBHOOK_SECRET`, `WEBHOOK_SIGNATURE_SECRET`, `EMAIL_SERVICE`/`EMAIL_USER`/`EMAIL_PASSWORD`/`EMAIL_FROM` (transport is constructed unconditionally), `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`/`AWS_S3_BUCKET` (constructed unconditionally in `StorageService`), `STELLAR_NETWORK`/`SOROBAN_RPC_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, `SENTRY_DSN`.

**Tier B — feature-conditional required**, via `Joi.when()` keyed on a
selector var:
- `PAYSTACK_SECRET_KEY` required iff `PAYMENT_GATEWAY=paystack`.
- `FLUTTERWAVE_SECRET_KEY` required iff `PAYMENT_GATEWAY=flutterwave`.
- `TRANSUNION_SMARTMOVE_API_URL`/`TRANSUNION_SMARTMOVE_API_KEY` required
  iff `USER_SCREENING_DEFAULT_PROVIDER=transunion_smartmove`.
- `EXPERIAN_CONNECT_API_URL`/`EXPERIAN_CONNECT_API_KEY` required iff
  `USER_SCREENING_DEFAULT_PROVIDER=experian_connect`.

**Tier C — format-validated when present, otherwise optional** (preserves
today's graceful-degradation behavior — the app already boots without these
and the specific feature self-disables at request time):
- Contract IDs (`CHIOMA_CONTRACT_ID`, `ESCROW_CONTRACT_ID`,
  `DISPUTE_CONTRACT_ID`, `RENT_OBLIGATION_CONTRACT_ID`,
  `PAYMENT_PROCESSING_CONTRACT_ID`, `AGENT_REGISTRY_CONTRACT_ID`) — must
  match Soroban contract ID shape (`C` + 55 base32 chars) when set.
- Stellar secret keys (`STELLAR_ADMIN_SECRET_KEY`, `SERVER_STELLAR_SECRET`,
  `STELLAR_SERVER_SECRET_KEY`, `STELLAR_ANCHOR_SECRET_KEY`) — must match
  Stellar seed shape (`S` + 55 base32 chars) when set.
- `STELLAR_ENCRYPTION_KEY`, OAuth2 group (`OAUTH2_CLIENT_ID`,
  `OAUTH2_CLIENT_SECRET`, `OAUTH2_PROVIDER_URL`, `OAUTH2_REDIRECT_URI`),
  `OPENAI_API_KEY`, `PINATA_JWT`, `ANCHOR_API_URL`/`ANCHOR_API_KEY` — basic
  type/non-placeholder checks when present, no presence requirement.

**Everything else** (logging config, monitoring thresholds, bull queue
tuning, admin/agent/tenant/landlord seed defaults, request-size limits,
health-check thresholds, etc.): type/enum validated with the defaults the
code already falls back to; never hard-required.

`STELLAR_PLATFORM_SECRET_KEY`, `STELLAR_PLATFORM_PUBLIC_KEY`,
`METRICS_ENABLED`, `TRACING_ENABLED` get no new validation rules (dead code
— see Non-goals).

## Documentation

- Add the ~70 vars missing from `.env.example` (grouped and commented like
  the existing sections: OAuth2, screening providers, contract IDs beyond
  the ones already listed, webhook secrets, request-size limits, storage
  CDN, security.txt fields, observability/otel, admin/agent/tenant/landlord
  seed groups, DB encryption/monitoring, graceful shutdown timeout, etc.)
- Update `CONFIGURATION_OPTIONS.md` reference tables and
  `CONFIGURATION_MANAGEMENT.md`'s "Required Variables by Environment" table
  to match the tiers above.
- "Create sample env files" (from the issue's task list) is satisfied by
  making `.env.example` complete — it's the project's established single
  source of truth for samples; no new files are introduced.

## Testing

Extend `backend/src/config/env.validation.spec.ts` with cases per tier:
- Tier A: missing in production → throws with that var named.
- Tier B: gate active + var missing → throws; gate inactive → passes without
  the var.
- Tier C: present + malformed → throws; absent → passes.
- `NODE_ENV=test` path unaffected (existing tests must still pass).

## Out of scope / follow-ups noted but not implemented

- Removing dead config (`STELLAR_PLATFORM_SECRET_KEY`/`_PUBLIC_KEY`,
  `METRICS_ENABLED`, `TRACING_ENABLED`).
- `src/common/lock/lock.module.ts` uses classic `REDIS_HOST`/`REDIS_PORT`
  only (no Upstash branch), inconsistent with `app.module.ts` and
  `queues.module.ts`. Not a validation concern, flagged for a separate fix.
