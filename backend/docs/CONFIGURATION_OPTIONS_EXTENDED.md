# Configuration Options (Extended)

Environment variables validated by
[`src/config/env.validation.ts`](../src/config/env.validation.ts) that
are not covered in [`CONFIGURATION_OPTIONS.md`](./CONFIGURATION_OPTIONS.md)
(#2054). Grouped the same way the validation schema itself groups
them (`databaseExtraSchema`, `authExtraSchema`, etc., all `.concat()`'d
into `additionalVarsSchema`), so a given variable's table here lines up
with its actual validation rule in that file.

**Requiredness column (R / O / C):** `R` = required once deployed
(`requiredWhenDeployed`/`requiredInProduction` in the schema), `C` =
conditionally required (only when a specific selector variable is set
to a specific value, noted in the Description column), `O` = always
optional. Unlike `CONFIGURATION_OPTIONS.md`'s per-environment columns,
these are format-checked only when present, so there's a single column
here rather than one per environment; see the schema file itself for
the exact `.when()` condition behind any `C`.

---

## Database (extra)

| Variable                                                                                                  | Type                | Req | Description                                                             |
| --------------------------------------------------------------------------------------------------------- | ------------------- | --- | ----------------------------------------------------------------------- |
| `DB_TYPE`                                                                                                 | string (`postgres`) | O   | Database driver; only `postgres` is validated                           |
| `DB_SSL_REJECT_UNAUTHORIZED`                                                                              | boolean             | O   | Whether to reject a DB TLS cert that doesn't validate                   |
| `TYPEORM_LOGGING`                                                                                         | boolean             | O   | Enable TypeORM's own query logger (distinct from `DB_LOGGING`)          |
| `DB_POOL_MIN`                                                                                             | number (≥0)         | O   | Minimum pool connections (see `database-config.ts`)                     |
| `DB_POOL_MAX`                                                                                             | number (≥1)         | O   | Maximum pool connections                                                |
| `DB_POOL_CONNECTION_TIMEOUT`                                                                              | number (≥0, ms)     | O   | Time to wait for a free connection before erroring                      |
| `DB_POOL_IDLE_TIMEOUT`                                                                                    | number (≥0, ms)     | O   | How long an idle connection stays open before being closed              |
| `DB_REPLICA_HOST` / `DB_REPLICA_PORT` / `DB_REPLICA_USERNAME` / `DB_REPLICA_PASSWORD` / `DB_REPLICA_NAME` | string/number       | O   | Read-replica connection, used by `ReadReplicaInterceptor`               |
| `DB_REPLICATION_MAX_LAG_SECONDS`                                                                          | number (≥0)         | O   | Max acceptable replica lag before falling back to primary               |
| `DB_ENCRYPTION_KEY`                                                                                       | string              | O   | Key for column-level encryption (KYC, sensitive fields)                 |
| `DB_ENCRYPTION_KEY_VERSION`                                                                               | number (≥1)         | O   | Current key version, for key-rotation support                           |
| `DB_ENCRYPTION_ROTATION_DAYS`                                                                             | number (≥1)         | O   | How often the encryption key should be rotated                          |
| `DB_MONITORING_ENABLED`                                                                                   | boolean             | O   | Enables `DatabaseMonitorService`'s pool/query metrics                   |
| `DB_POOL_WARNING_PERCENT` / `DB_POOL_CRITICAL_PERCENT`                                                    | number (0–100)      | O   | Pool-utilization thresholds for health warnings                         |
| `DB_QUERY_TIME_WARNING_MS` / `DB_QUERY_TIME_CRITICAL_MS`                                                  | number (≥0)         | O   | Slow-query thresholds for monitoring alerts                             |
| `DB_INDEX_UNUSED_MIN_SCANS` / `DB_INDEX_UNUSED_MIN_SIZE_MB`                                               | number (≥0)         | O   | Thresholds `scripts/db-index-review.ts` uses to flag an index as unused |
| `QUERY_ANALYSIS_SLOW_THRESHOLD_MS`                                                                        | number (≥0)         | O   | Default slow-query threshold for ad-hoc query analysis                  |
| `QUERY_ANALYSIS_SLOW_THRESHOLD_OVERRIDES_MS`                                                              | string              | O   | Per-query threshold overrides (format defined by the consuming service) |

## Authentication (extra)

| Variable                                                             | Type                 | Req | Description                                                   |
| -------------------------------------------------------------------- | -------------------- | --- | ------------------------------------------------------------- |
| `JWT_EXPIRATION` / `JWT_REFRESH_EXPIRATION`                          | string (`\d+[smhd]`) | O   | Token lifetimes, e.g. `15m`, `7d`                             |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX_REQUESTS`         | number (≥1)          | O   | Rate limit window/ceiling for auth endpoints specifically     |
| `PASSWORD_RESET_EMAIL_LIMIT` / `PASSWORD_RESET_EMAIL_WINDOW_SECONDS` | number (≥1)          | O   | Caps how many reset emails one account can trigger per window |
| `MFA_REQUIRED`                                                       | boolean              | O   | Forces MFA enrollment platform-wide when `true`               |

## Redis (extra)

| Variable         | Type    | Req | Description                                                           |
| ---------------- | ------- | --- | --------------------------------------------------------------------- |
| `REDIS_PASSWORD` | string  | O   | Redis auth password (blank allowed for local dev)                     |
| `REDIS_USERNAME` | string  | O   | Redis ACL username (Redis 6+)                                         |
| `REDIS_TLS`      | boolean | O   | Enable TLS for the Redis connection (e.g. managed Redis like Upstash) |

## Search

| Variable            | Type         | Req | Description                                    |
| ------------------- | ------------ | --- | ---------------------------------------------- |
| `ELASTICSEARCH_URL` | string (uri) | O   | Elasticsearch endpoint for the `search` module |

## Stellar / Soroban (extra)

| Variable                                                                                                                                                              | Type                          | Req | Description                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --- | ---------------------------------------------------------------------------------------------------------- |
| `STELLAR_NETWORK`                                                                                                                                                     | string (`testnet`\|`mainnet`) | R   | Which Stellar network to target                                                                            |
| `SOROBAN_RPC_URL` / `SOROBAN_RPC_FALLBACK_URL`                                                                                                                        | string (uri)                  | R   | Primary/fallback Soroban RPC endpoints                                                                     |
| `STELLAR_HORIZON_URL` / `HORIZON_URL`                                                                                                                                 | string (uri)                  | O   | Horizon endpoint (two historical env var names for the same thing)                                         |
| `STELLAR_HORIZON_FALLBACK_URL`                                                                                                                                        | string (uri)                  | R   | Fallback Horizon endpoint if the primary is unreachable                                                    |
| `STELLAR_FRIENDBOT_URL`                                                                                                                                               | string (uri)                  | O   | Testnet friendbot, for funding test accounts; unused in production                                         |
| `STELLAR_BASE_FEE`                                                                                                                                                    | number (≥0)                   | O   | Base transaction fee, in stroops                                                                           |
| `STELLAR_ADMIN_SECRET_KEY` / `SERVER_STELLAR_SECRET` / `STELLAR_SERVER_SECRET_KEY` / `STELLAR_ANCHOR_SECRET_KEY`                                                      | string (`S` + 55 chars)       | O   | Server-held Stellar secret keys for different roles (admin ops, general server signing, anchor operations) |
| `STELLAR_ENCRYPTION_KEY`                                                                                                                                              | string                        | O   | Encrypts stored Stellar secrets at rest                                                                    |
| `DEFAULT_ARBITER_ADDRESS`                                                                                                                                             | string (`G` + 55 chars)       | R   | Default dispute arbiter's Stellar public key                                                               |
| `PROTOCOL_WALLET_ADDRESS`                                                                                                                                             | string (`G` + 55 chars)       | O   | Platform's own wallet, for protocol fee collection                                                         |
| `CHIOMA_CONTRACT_ID` / `ESCROW_CONTRACT_ID` / `DISPUTE_CONTRACT_ID` / `RENT_OBLIGATION_CONTRACT_ID` / `PAYMENT_PROCESSING_CONTRACT_ID` / `AGENT_REGISTRY_CONTRACT_ID` | string (`C` + 55 chars)       | O   | Deployed Soroban contract IDs, one per contract in `contract/contracts/`                                   |
| `MIN_VOTES_REQUIRED`                                                                                                                                                  | number (≥1)                   | O   | Minimum arbiter votes to resolve a dispute                                                                 |

## Anchor Integration (extra)

| Variable                            | Type   | Req | Description                                                  |
| ----------------------------------- | ------ | --- | ------------------------------------------------------------ |
| `ANCHOR_API_URL` / `ANCHOR_API_KEY` | string | O   | SEP-6/24 anchor's own API endpoint and credential            |
| `ANCHOR_USDC_ASSET`                 | string | O   | Asset code/issuer identifying USDC on the configured network |
| `SUPPORTED_FIAT_CURRENCIES`         | string | O   | Comma-separated fiat currency codes the anchor flow accepts  |

## FX Rates

| Variable                                            | Type                                        | Req | Description                                    |
| --------------------------------------------------- | ------------------------------------------- | --- | ---------------------------------------------- |
| `FX_RATE_PROVIDER`                                  | string (`mock`\|`external`, default `mock`) | O   | Which exchange-rate source to use              |
| `FX_RATE_PROVIDER_URL` / `FX_RATE_PROVIDER_API_KEY` | string                                      | C   | Required only when `FX_RATE_PROVIDER=external` |

## Storage (extra)

| Variable                        | Type         | Req | Description                                               |
| ------------------------------- | ------------ | --- | --------------------------------------------------------- |
| `CDN_BASE_URL`                  | string (uri) | O   | Public CDN base URL for serving stored assets             |
| `PINATA_JWT` / `PINATA_GATEWAY` | string       | O   | Pinata (IPFS pinning service) credential and gateway host |

## Payments (extra)

| Variable                          | Type                    | Req | Description                                                                                                          |
| --------------------------------- | ----------------------- | --- | -------------------------------------------------------------------------------------------------------------------- |
| `PAYMENT_PROCESSING_CONTRACT_ID`  | string (`C` + 55 chars) | O   | See Stellar/Soroban section above (listed there too since it's a contract ID)                                        |
| `PAYMENT_WEBHOOK_SECRET`          | string                  | R   | Verifies the payment gateway's webhook signature                                                                     |
| `PAYMENT_WEBHOOK_SECRET_PREVIOUS` | string                  | O   | Previous webhook secret, kept during a rotation window so in-flight webhooks signed with the old secret still verify |

## Frontend / CORS (extra)

Covered variables (`FRONTEND_URL`, `CORS_ORIGINS`, `CORS_CREDENTIALS`)
are already in `CONFIGURATION_OPTIONS.md`'s Frontend/CORS section;
`API_BASE_URL` and `PASSWORD_RESET_URL` are the two missing from that
table:

| Variable             | Type         | Req            | Description                                                             |
| -------------------- | ------------ | -------------- | ----------------------------------------------------------------------- |
| `PASSWORD_RESET_URL` | string (uri) | O              | Frontend URL the password-reset email links to                          |
| `API_BASE_URL`       | string (uri) | R (production) | Base URL the frontend (or any external consumer) uses to reach this API |

## Security (extra)

| Variable                                                                          | Type         | Req | Description                                                                       |
| --------------------------------------------------------------------------------- | ------------ | --- | --------------------------------------------------------------------------------- |
| `SECURITY_CONTACT`                                                                | string       | O   | Contact shown in the `security.txt`-style disclosure endpoint                     |
| `SECURITY_POLICY_URL` / `SECURITY_ACKNOWLEDGMENTS_URL` / `SECURITY_CANONICAL_URL` | string (uri) | O   | Links published in the security disclosure response                               |
| `SECURITY_PREFERRED_LANGUAGES`                                                    | string       | O   | Comma-separated language codes for the security disclosure                        |
| `SECURITY_EXPIRES`                                                                | string       | O   | Expiry date for the published security policy (per the `security.txt` RFC format) |
| `SECURITY_ENCRYPTION_KEYS`                                                        | string       | O   | Public key(s) referenced by the security disclosure for encrypted reports         |

## Logging (extra)

| Variable                         | Type                                               | Req | Description                                                                                                                   |
| -------------------------------- | -------------------------------------------------- | --- | ----------------------------------------------------------------------------------------------------------------------------- |
| `LOG_TRANSPORT`                  | string (comma-separated `console`/`file`/`sentry`) | O   | Which log transports are active; validated against `logger.service.ts`'s actual transport map so a typo fails fast at startup |
| `LOG_FILE` / `LOG_DIR`           | string                                             | O   | File transport's output path/directory                                                                                        |
| `LOG_SLOW_REQUEST_THRESHOLD`     | number (≥0)                                        | O   | Request duration (ms) above which a request is logged as slow                                                                 |
| `LOG_SKIP_PATHS`                 | string                                             | O   | Comma-separated paths excluded from request logging (e.g. health checks)                                                      |
| `LOG_MAX_FILES` / `LOG_MAX_SIZE` | string                                             | O   | File transport rotation limits                                                                                                |
| `LOG_ERROR_MAX_FILES`            | string                                             | O   | Rotation limit specifically for the error-level log file                                                                      |
| `LOG_REDACT_KEYS`                | string                                             | O   | Comma-separated field names to redact from logged objects (e.g. `password`, `token`)                                          |
| `LOG_REDACT_MAX_DEPTH`           | number (≥0)                                        | O   | How deep into nested objects the redactor walks                                                                               |
| `LOG_REDACT_PLACEHOLDER`         | string                                             | O   | Replacement string shown in place of a redacted value                                                                         |

## Monitoring (extra)

| Variable                             | Type         | Req | Description                                                 |
| ------------------------------------ | ------------ | --- | ----------------------------------------------------------- |
| `OTEL_ENABLED`                       | boolean      | O   | Enables OpenTelemetry tracing (`common/tracing/tracing.ts`) |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | string (uri) | O   | Where traces are exported to                                |
| `OTEL_LOG_LEVEL`                     | string       | O   | OpenTelemetry SDK's own internal log verbosity              |

## Health Checks (extra)

| Variable                    | Type            | Req | Description                                                               |
| --------------------------- | --------------- | --- | ------------------------------------------------------------------------- |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | number (≥0, ms) | O   | Max time to wait for in-flight requests to finish before forcing shutdown |

## Bull Job Queues (extra)

| Variable                                                                             | Type        | Req | Description                                                                           |
| ------------------------------------------------------------------------------------ | ----------- | --- | ------------------------------------------------------------------------------------- |
| `BULL_QUEUE_VIDEO_PROCESSING_ATTEMPTS` / `BULL_QUEUE_VIDEO_PROCESSING_BACKOFF_DELAY` | number (≥0) | O   | Retry attempts/backoff for the video-processing queue                                 |
| `DEAD_LETTER_QUEUE_ENABLED`                                                          | boolean     | O   | Whether permanently-failed jobs are moved to a dead-letter queue instead of discarded |
| `DEAD_LETTER_RETENTION_DAYS`                                                         | number (≥0) | O   | How long dead-lettered jobs are kept before purge                                     |
| `ENABLE_CACHE_WARMING`                                                               | boolean     | O   | Enables `PropertyCacheWarmingService`'s scheduled cache pre-population                |

## Database Seeding

Seed data for local/staging environments
(`scripts/seed-production.sh` and related seed scripts). Not used in
production.

| Variable                                                                                                                    | Type           | Req | Description                         |
| --------------------------------------------------------------------------------------------------------------------------- | -------------- | --- | ----------------------------------- |
| `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_FIRST_NAME` / `ADMIN_DEFAULT_LAST_NAME` / `ADMIN_AUTO_GENERATE_PASSWORD`             | string/boolean | O   | Default seeded admin account        |
| `AGENT_DEFAULT_EMAIL` / `AGENT_DEFAULT_FIRST_NAME` / `AGENT_DEFAULT_LAST_NAME` / `AGENT_AUTO_GENERATE_PASSWORD`             | string/boolean | O   | Default seeded agent account        |
| `USER_DEFAULT_EMAIL` / `USER_DEFAULT_FIRST_NAME` / `USER_DEFAULT_LAST_NAME` / `USER_AUTO_GENERATE_PASSWORD`                 | string/boolean | O   | Default seeded generic user account |
| `TENANT_DEFAULT_EMAIL` / `TENANT_DEFAULT_FIRST_NAME` / `TENANT_DEFAULT_LAST_NAME` / `TENANT_AUTO_GENERATE_PASSWORD`         | string/boolean | O   | Default seeded tenant account       |
| `LANDLORD_DEFAULT_EMAIL` / `LANDLORD_DEFAULT_FIRST_NAME` / `LANDLORD_DEFAULT_LAST_NAME` / `LANDLORD_AUTO_GENERATE_PASSWORD` | string/boolean | O   | Default seeded landlord account     |

`*_AUTO_GENERATE_PASSWORD=true` generates a random password for that
seeded account instead of requiring one to be set elsewhere; check the
seed script's own output/logs for where the generated password ends up.

## Tenant Screening

| Variable                                                        | Type                                                | Req | Description                                                               |
| --------------------------------------------------------------- | --------------------------------------------------- | --- | ------------------------------------------------------------------------- |
| `USER_SCREENING_DEFAULT_PROVIDER`                               | string (`transunion_smartmove`\|`experian_connect`) | O   | Which background-check provider to use                                    |
| `USER_SCREENING_SANDBOX_MODE`                                   | boolean                                             | O   | Routes screening requests to the provider's sandbox instead of production |
| `TENANT_SCREENING_CONSENT_TTL_DAYS`                             | number (≥0)                                         | O   | How long a tenant's screening consent remains valid                       |
| `TENANT_SCREENING_REPORT_TTL_DAYS`                              | number (≥0)                                         | O   | How long a completed screening report is retained                         |
| `TRANSUNION_SMARTMOVE_API_URL` / `TRANSUNION_SMARTMOVE_API_KEY` | string                                              | C   | Required only when `USER_SCREENING_DEFAULT_PROVIDER=transunion_smartmove` |
| `EXPERIAN_CONNECT_API_URL` / `EXPERIAN_CONNECT_API_KEY`         | string                                              | C   | Required only when `USER_SCREENING_DEFAULT_PROVIDER=experian_connect`     |
| `FRAUD_HOOKS_ENABLED`                                           | boolean                                             | O   | Enables fraud-detection hooks on screening/booking flows                  |

## AI

| Variable         | Type   | Req | Description                                                         |
| ---------------- | ------ | --- | ------------------------------------------------------------------- |
| `OPENAI_API_KEY` | string | O   | Used by the `ai` module (pricing suggestions, occupancy prediction) |

## Webhooks and Alerting

| Variable                                                                   | Type           | Req | Description                                                    |
| -------------------------------------------------------------------------- | -------------- | --- | -------------------------------------------------------------- |
| `WEBHOOK_SIGNATURE_SECRET`                                                 | string         | R   | Signs outbound webhooks this platform sends to integrators     |
| `ALERT_WEBHOOK_SECRET`                                                     | string         | O   | Verifies inbound alert webhooks (e.g. from Alertmanager)       |
| `ALERT_ONCALL_EMAIL` / `ALERT_ESCALATION_EMAIL` / `ALERT_MANAGEMENT_EMAIL` | string (email) | O   | Escalation tier recipients for `ErrorEscalationService`        |
| `SLACK_ALERT_WEBHOOK_URL`                                                  | string (uri)   | O   | Slack incoming webhook for alert notifications                 |
| `ALERT_ESCALATION_MINUTES` / `ALERT_ESCALATION_TIER2_MINUTES`              | number (≥0)    | O   | Time before an unacknowledged alert escalates to the next tier |
| `ERROR_NOTIFICATION_ENABLED`                                               | boolean        | O   | Master switch for the error-notification pipeline              |

## Request Size Limits

| Variable                                                                                     | Type                 | Req | Description                                                                                    |
| -------------------------------------------------------------------------------------------- | -------------------- | --- | ---------------------------------------------------------------------------------------------- |
| `REQUEST_SIZE_LIMIT_JSON` / `REQUEST_SIZE_LIMIT_MULTIPART` / `REQUEST_SIZE_LIMIT_URLENCODED` | string (e.g. `10mb`) | O   | Body-size caps per content type, enforced by `RequestSizeLimitMiddleware`                      |
| `QUERY_MAX_DEPTH`                                                                            | number (≥1)          | O   | Max allowed nesting depth for structured query params, enforced by `QueryDepthLimitMiddleware` |

## Response Time Tracking

| Variable                          | Type        | Req | Description                                                   |
| --------------------------------- | ----------- | --- | ------------------------------------------------------------- |
| `RESPONSE_TIME_ENABLED`           | boolean     | O   | Master switch for `ResponseTimeInterceptor`                   |
| `RESPONSE_TIME_SLOW_THRESHOLD_MS` | number (≥0) | O   | Threshold above which a request is flagged as slow            |
| `RESPONSE_TIME_WINDOW_SECONDS`    | number (≥0) | O   | Rolling window used for response-time percentile calculations |
| `RESPONSE_TIME_BUFFER_SIZE`       | number (≥0) | O   | In-memory sample buffer size backing those percentiles        |

## API Versioning

| Variable                  | Type    | Req | Description                                                                  |
| ------------------------- | ------- | --- | ---------------------------------------------------------------------------- |
| `API_LATEST_VERSION`      | string  | O   | The current latest API version string, surfaced via `DeprecationInterceptor` |
| `API_DEPRECATION_ENABLED` | boolean | O   | Master switch for deprecation warnings on older API versions                 |
| `OPENAPI_GENERATE`        | boolean | O   | Set during `pnpm run openapi:generate` to skip real DB/service bootstrapping |

## Business Rule Overrides

Optional overrides for constants that otherwise default from
[`common/constants/business-rules.constants.ts`](../src/common/constants/business-rules.constants.ts).
All are `O` (optional); every one has a hardcoded default already in
that file; the env var only needs setting to change the default for a
given deployment.

| Variable                                                                                     | Type          | Description                                                                                                          |
| -------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `MAX_FAILED_LOGIN_ATTEMPTS`                                                                  | number (≥1)   | Failed logins before account lockout                                                                                 |
| `LOCKOUT_DURATION_MINUTES`                                                                   | number (≥1)   | How long a locked account stays locked                                                                               |
| `PASSWORD_RESET_TOKEN_EXPIRY_HOURS`                                                          | number (≥1)   | Password reset token lifetime                                                                                        |
| `OAUTH_STATE_EXPIRY_MINUTES`                                                                 | number (≥1)   | OAuth2 `state` parameter lifetime                                                                                    |
| `STELLAR_AUTH_CHALLENGE_EXPIRY_MINUTES`                                                      | number (≥1)   | SEP-0010 challenge transaction lifetime                                                                              |
| `MFA_BACKUP_CODES_COUNT`                                                                     | number (≥1)   | How many MFA backup codes are generated per user                                                                     |
| `BCRYPT_SALT_ROUNDS`                                                                         | number (4–20) | Bcrypt cost factor for password hashing                                                                              |
| `MFA_BACKUP_CODE_SALT_ROUNDS`                                                                | number (4–20) | Bcrypt cost factor for hashing MFA backup codes                                                                      |
| `IP_BLOCK_DURATION_MS`                                                                       | number (≥0)   | How long a flagged IP stays blocked                                                                                  |
| `BRUTE_FORCE_WINDOW_MS` / `BRUTE_FORCE_THRESHOLD`                                            | number        | Window and attempt count defining brute-force detection                                                              |
| `PER_IP_RATE_THRESHOLD`                                                                      | number (≥1)   | Requests-per-IP threshold feeding abuse detection                                                                    |
| `DATA_EXFILTRATION_RECORD_THRESHOLD`                                                         | number (≥1)   | Record-count threshold that flags a bulk-read as suspicious                                                          |
| `PROPERTY_DRAFT_EXPIRY_DAYS`                                                                 | number (≥1)   | How long an unpublished property draft is kept before expiry                                                         |
| `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`                                                        | number (≥1)   | Pagination defaults/ceiling across list endpoints                                                                    |
| `DISPUTE_EVIDENCE_MAX_FILE_SIZE_BYTES` / `DISPUTE_EVIDENCE_VIDEO_MAX_FILE_SIZE_BYTES`        | number (≥1)   | Upload size caps for dispute evidence (general / video)                                                              |
| `STORAGE_MAX_FILE_SIZE_BYTES`                                                                | number (≥1)   | General upload size cap                                                                                              |
| `BULL_QUEUE_VIDEO_PROCESSING_ATTEMPTS` / `BULL_QUEUE_VIDEO_PROCESSING_BACKOFF_DELAY`         | number (≥0)   | Also listed under Bull Job Queues above; this schema has it twice (business-rule override vs. queue-specific config) |
| `NOTIFICATION_RETENTION_DAYS` / `DISPUTE_RETENTION_DAYS` / `QUARANTINED_FILE_RETENTION_DAYS` | number (≥1)   | Retention windows for notifications, disputes, and quarantined (failed-scan) uploads                                 |
| `STELLAR_TX_TIMEOUT_SECONDS` (≤300) / `STELLAR_TX_EXTENDED_TIMEOUT_SECONDS` (≤600)           | number (≥1)   | Timeouts for standard vs. extended (e.g. multi-sig) Stellar transactions                                             |
| `WS_SESSION_ABSOLUTE_TTL_MS` / `WS_SESSION_IDLE_TTL_MS`                                      | number (≥1)   | Absolute and idle timeouts for a WebSocket session                                                                   |
| `WS_MAX_CONNECTIONS_PER_USER`                                                                | number (≥1)   | Caps concurrent WebSocket connections per user                                                                       |
| `RENT_LATE_FEE_GRACE_PERIOD_DAYS`                                                            | number (≥0)   | Days after due date before a late fee applies                                                                        |
| `RENT_LATE_FEE_FLAT_RATE` / `RENT_LATE_FEE_DAILY_PENALTY_RATE` (0–1)                         | number        | Flat and daily-compounding late fee rates, as a fraction of rent                                                     |
| `LOCK_SERVICE_DEFAULT_RETRIES`                                                               | number (≥0)   | Default retry count for `LockService`'s distributed-lock acquisition                                                 |
| `QUEUE_DEFAULT_JOB_ATTEMPTS` / `QUEUE_BLOCKCHAIN_JOB_ATTEMPTS`                               | number (≥0)   | Default retry attempts for general vs. blockchain-touching queue jobs                                                |
