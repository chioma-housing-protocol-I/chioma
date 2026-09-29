# Environment Variable Reference

Source of truth: `backend/src/config/env.validation.ts` (runs at boot via `ConfigModule.forRoot({ validate })`).
Template: `backend/.env.example`. Run `npm run env:check` in `backend/` to verify the template covers every variable the schema reads.

Legend — **Req**: `all` = every env incl. test, `dev+` = development/staging/production, `deployed` = staging/production, `prod` = production only, `—` = optional. **Secret**: never commit real values.

## Validated by the schema

| Variable                                          | Purpose                                                                                   | Default              | Req       | Secret   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- | --------- | -------- |
| `NODE_ENV`                                        | `development` \| `staging` \| `production` \| `test`; selects validation strictness       | `development`        | —         |          |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX`               | Global throttle window (s) and request cap                                                | —                    | all       |          |
| `RATE_LIMIT_AUTH_TTL` / `RATE_LIMIT_AUTH_MAX`     | Throttle for auth endpoints                                                               | —                    | all       |          |
| `RATE_LIMIT_STRICT_TTL` / `RATE_LIMIT_STRICT_MAX` | Throttle for sensitive endpoints                                                          | —                    | all       |          |
| `JWT_SECRET`                                      | Access-token signing key, ≥32 chars, no placeholder/`test-jwt`/`e2e-jwt` in deployed envs | —                    | dev+      | ✅       |
| `JWT_REFRESH_SECRET`                              | Refresh-token signing key, ≥32 chars, must differ from `JWT_SECRET`                       | —                    | dev+      | ✅       |
| `DATABASE_URL`                                    | Managed Postgres URL; must contain `sslmode=`                                             | —                    | deployed¹ | ✅       |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_NAME` | Discrete Postgres connection                                                              | port `5432`          | deployed¹ |          |
| `DB_PASSWORD`                                     | Postgres password                                                                         | —                    | deployed¹ | ✅       |
| `DB_SSL`                                          | Enable TLS to Postgres                                                                    | `false`              | prod²     |          |
| `REDIS_URL` / `REDIS_TOKEN`                       | Upstash Redis                                                                             | —                    | deployed³ | token ✅ |
| `REDIS_HOST` / `REDIS_PORT`                       | Classic Redis                                                                             | `localhost` / `6379` | deployed³ |          |
| `ENCRYPTION_KEY_BASE64`                           | Field encryption key, base64 of exactly 32 bytes                                          | —                    | deployed⁴ | ✅       |
| `ENCRYPTION_KEYS`                                 | JSON array of base64 keys for rotation; first is active                                   | —                    | deployed⁴ | ✅       |
| `SECURITY_ENCRYPTION_KEY`                         | 64 hex chars (`openssl rand -hex 32`) for security module                                 | —                    | deployed  | ✅       |
| `PAYMENT_METADATA_SECRET`                         | Signs payment metadata; placeholder rejected in deployed envs                             | —                    | —         | ✅       |

¹ `DATABASE_URL` **or** all of `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`.
² Required `true` in production unless `DATABASE_URL` is used.
³ `REDIS_URL`+`REDIS_TOKEN` **or** `REDIS_HOST`+`REDIS_PORT`.
⁴ One of `ENCRYPTION_KEYS` or `ENCRYPTION_KEY_BASE64`.

## Not schema-validated (read by individual modules)

| Group             | Variables                                                                                                                                                                                                               | Secret                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Server            | `PORT` (3000), `FRONTEND_URL`, `PASSWORD_RESET_URL`, `API_LATEST_VERSION`, `API_DEPRECATION_ENABLED`                                                                                                                    |                                                                                     |
| Auth              | `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX_REQUESTS`, `SECURITY_CSRF_ENABLED`                                                                                        |                                                                                     |
| Auth secrets      | `SECURITY_SESSION_SECRET`                                                                                                                                                                                               | ✅                                                                                  |
| Admin seed        | `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_FIRST_NAME`, `ADMIN_DEFAULT_LAST_NAME`, `ADMIN_AUTO_GENERATE_PASSWORD`                                                                                                            |                                                                                     |
| Redis extras      | `REDIS_USERNAME`, `REDIS_TLS`                                                                                                                                                                                           | `REDIS_PASSWORD` ✅                                                                 |
| Payments          | `PAYMENT_GATEWAY`, `PAYMENT_GATEWAY_TIMEOUT_MS`                                                                                                                                                                         | `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` ✅                                  |
| Stellar / Soroban | `STELLAR_NETWORK`, `STELLAR_HORIZON_URL`, `SOROBAN_RPC_URL`, `CHIOMA_CONTRACT_ID`, `ESCROW_CONTRACT_ID`, `RENT_OBLIGATION_CONTRACT_ID`, `DISPUTE_CONTRACT_ID`, `DEFAULT_ARBITER_ADDRESS`, `MIN_VOTES_REQUIRED`          | `STELLAR_ADMIN_SECRET_KEY`, `SERVER_STELLAR_SECRET`, `STELLAR_SERVER_SECRET_KEY` ✅ |
| Anchor            | `ANCHOR_API_URL`, `ANCHOR_USDC_ASSET`, `SUPPORTED_FIAT_CURRENCIES`                                                                                                                                                      | `ANCHOR_API_KEY` ✅                                                                 |
| Storage           | `AWS_REGION`, `PINATA_GATEWAY`                                                                                                                                                                                          | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `PINATA_JWT` ✅                       |
| Email             | `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_FROM`                                                                                                                                                                             | `EMAIL_PASSWORD` ✅                                                                 |
| Queues            | `BULL_QUEUE_{EMAIL,DOCUMENTS,BLOCKCHAIN,DATA_SYNC}_{ATTEMPTS,BACKOFF_DELAY}`, `DEAD_LETTER_QUEUE_ENABLED`, `DEAD_LETTER_RETENTION_DAYS`                                                                                 |                                                                                     |
| Logging           | `LOG_LEVEL`, `LOG_FORMAT`, `LOG_SLOW_REQUEST_THRESHOLD`, `LOG_SKIP_PATHS`, `LOG_MAX_FILES`, `LOG_MAX_SIZE`                                                                                                              |                                                                                     |
| Observability     | `METRICS_ENABLED`, `TRACING_ENABLED`, `RESPONSE_TIME_*`, `HEALTH_CHECK_TIMEOUT`, `MEMORY_{WARNING,ERROR}_THRESHOLD`, `SENTRY_ENVIRONMENT`, `DB_MONITORING_ENABLED`, `DB_POOL_*`, `DB_QUERY_TIME_*`, `DB_INDEX_UNUSED_*` | `SENTRY_DSN` ✅                                                                     |
| Alerting          | `ERROR_NOTIFICATION_ENABLED`, `ALERT_ONCALL_EMAIL`, `ALERT_ESCALATION_EMAIL`, `ALERT_MANAGEMENT_EMAIL`, `ALERT_ESCALATION_MINUTES`                                                                                      | `SLACK_ALERT_WEBHOOK_URL`, `ALERT_WEBHOOK_SECRET` ✅                                |

Defaults and example values for this table live in `backend/.env.example`. Per-environment values: `backend/.env.{development,staging,production,test}`.
