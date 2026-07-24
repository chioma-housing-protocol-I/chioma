# Configuration Options and Environment Variables

Complete reference of all environment variables used by the Chioma backend.

**Related documents:**

- [Configuration Management](./CONFIGURATION_MANAGEMENT.md) — setup, validation, secrets
- [Secrets Management](./security/SECRETS_MANAGEMENT.md) — secret generation and rotation
- [Production Setup](./deployment/PRODUCTION_SETUP.md) — production-specific configuration

---

## Variable Naming Conventions

- All variables use `UPPER_SNAKE_CASE`.
- Boolean flags are the string `"true"` or `"false"`.
- Numeric values are stored as strings and parsed by the application.
- Duration values use milliseconds unless otherwise noted.
- Size values use bytes unless otherwise noted.

---

## Required vs. Optional

| Symbol | Meaning                                                      |
| ------ | ------------------------------------------------------------ |
| **R**  | Required — application fails to start if missing             |
| **O**  | Optional — application uses a default or degrades gracefully |
| **C**  | Conditional — required only in certain configurations        |
| **-**  | Not applicable in this environment                           |

---

## Application

| Variable   | Type   | Default | Dev | Stg | Prd | Test | Description                                                  |
| ---------- | ------ | ------- | --- | --- | --- | ---- | ------------------------------------------------------------ |
| `NODE_ENV` | string | —       | R   | R   | R   | R    | Runtime mode: `development`, `staging`, `production`, `test` |
| `PORT`     | number | `3000`  | R   | R   | R   | -    | HTTP server listen port                                      |

---

## Database (PostgreSQL)

| Variable       | Type    | Default     | Dev | Stg | Prd | Test | Description                                              |
| -------------- | ------- | ----------- | --- | --- | --- | ---- | -------------------------------------------------------- |
| `DB_HOST`      | string  | `localhost` | R   | R   | R   | R    | Database hostname                                        |
| `DB_PORT`      | number  | `5432`      | R   | R   | R   | R    | Database port                                            |
| `DB_USERNAME`  | string  | `postgres`  | R   | R   | R   | R    | Database user                                            |
| `DB_PASSWORD`  | string  | —           | R   | R   | R   | R    | Database password                                        |
| `DB_NAME`      | string  | `chioma_db` | R   | R   | R   | R    | Database name                                            |
| `DATABASE_URL` | string  | —           | -   | -   | R   | -    | Full connection URL with `?sslmode=require` (production) |
| `DB_SSL`       | boolean | `false`     | -   | -   | R   | -    | Enable SSL connection (production)                       |
| `DB_POOL_SIZE` | number  | `10`        | O   | O   | O   | O    | TypeORM connection pool size                             |
| `DB_LOGGING`   | boolean | `false`     | O   | O   | -   | -    | Enable TypeORM SQL query logging                         |

---

## Authentication (JWT)

| Variable                 | Type     | Default | Dev | Stg | Prd | Test | Description                                                                |
| ------------------------ | -------- | ------- | --- | --- | --- | ---- | -------------------------------------------------------------------------- |
| `JWT_SECRET`             | string   | —       | R   | R   | R   | R    | JWT signing secret (≥32 characters)                                        |
| `JWT_REFRESH_SECRET`     | string   | —       | R   | R   | R   | R    | Refresh token signing secret (≥32 characters, different from `JWT_SECRET`) |
| `JWT_EXPIRATION`         | duration | `15m`   | R   | R   | R   | -    | Access token lifetime (e.g., `15m`, `1h`)                                  |
| `JWT_REFRESH_EXPIRATION` | duration | `7d`    | R   | R   | R   | -    | Refresh token lifetime (e.g., `7d`, `30d`)                                 |

### Auth Rate Limiting

| Variable                       | Type   | Default  | Dev | Stg | Prd | Test | Description                            |
| ------------------------------ | ------ | -------- | --- | --- | --- | ---- | -------------------------------------- |
| `AUTH_RATE_LIMIT_WINDOW_MS`    | number | `900000` | O   | O   | O   | -    | Auth rate limit window in milliseconds |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | number | `5`      | O   | O   | O   | -    | Max auth requests per window           |

---

## Rate Limiting (NestJS Throttler)

| Variable                | Type        | Default | Dev | Stg | Prd | Test | Description                     |
| ----------------------- | ----------- | ------- | --- | --- | --- | ---- | ------------------------------- |
| `RATE_LIMIT_TTL`        | number (ms) | `60000` | R   | R   | R   | -    | General rate limit window       |
| `RATE_LIMIT_MAX`        | number      | `100`   | R   | R   | R   | -    | Max general requests per window |
| `RATE_LIMIT_AUTH_TTL`   | number (ms) | `60000` | R   | R   | R   | -    | Auth rate limit window          |
| `RATE_LIMIT_AUTH_MAX`   | number      | `5`     | R   | R   | R   | -    | Max auth requests per window    |
| `RATE_LIMIT_STRICT_TTL` | number (ms) | `60000` | R   | R   | R   | -    | Strict rate limit window        |
| `RATE_LIMIT_STRICT_MAX` | number      | `10`    | R   | R   | R   | -    | Max strict requests per window  |

---

## Redis / Cache

| Variable         | Type    | Default     | Dev | Stg | Prd | Test | Description                           |
| ---------------- | ------- | ----------- | --- | --- | --- | ---- | ------------------------------------- |
| `REDIS_HOST`     | string  | `localhost` | R   | R   | -   | -    | Redis hostname (dev/staging)          |
| `REDIS_PORT`     | number  | `6379`      | R   | R   | -   | -    | Redis port (dev/staging)              |
| `REDIS_PASSWORD` | string  | —           | O   | O   | -   | -    | Redis password                        |
| `REDIS_USERNAME` | string  | `default`   | O   | O   | -   | -    | Redis username (ACL-based Redis)      |
| `REDIS_TLS`      | boolean | `false`     | O   | O   | -   | -    | Enable TLS for Redis connection       |
| `REDIS_URL`      | string  | —           | -   | -   | R   | -    | Upstash Redis REST URL (production)   |
| `REDIS_TOKEN`    | string  | —           | -   | -   | R   | -    | Upstash Redis REST token (production) |

---

## Stellar / Soroban (Blockchain)

| Variable                      | Type   | Default       | Dev | Stg | Prd | Test | Description                          |
| ----------------------------- | ------ | ------------- | --- | --- | --- | ---- | ------------------------------------ |
| `STELLAR_NETWORK`             | string | `testnet`     | R   | R   | R   | -    | Network: `testnet` or `mainnet`      |
| `STELLAR_HORIZON_URL`         | string | (per network) | O   | O   | R   | -    | Horizon API endpoint                 |
| `SOROBAN_RPC_URL`             | string | —             | R   | R   | R   | -    | Soroban RPC endpoint                 |
| `STELLAR_ADMIN_SECRET_KEY`    | string | —             | O   | R   | R   | -    | Admin Stellar secret key             |
| `SERVER_STELLAR_SECRET`       | string | —             | O   | O   | O   | -    | Server Stellar secret for operations |
| `STELLAR_SERVER_SECRET_KEY`   | string | —             | O   | O   | O   | -    | Alternative server secret key        |
| `CHIOMA_CONTRACT_ID`          | string | —             | O   | O   | R   | -    | Chioma Soroban contract address      |
| `ESCROW_CONTRACT_ID`          | string | —             | O   | O   | R   | -    | Escrow Soroban contract address      |
| `RENT_OBLIGATION_CONTRACT_ID` | string | —             | O   | O   | R   | -    | Rent obligation NFT contract address |
| `DEFAULT_ARBITER_ADDRESS`     | string | —             | O   | O   | R   | -    | Default arbiter Stellar address      |

---

## Anchor Integration (SEP-6/24)

| Variable                    | Type   | Default           | Dev | Stg | Prd | Test | Description                         |
| --------------------------- | ------ | ----------------- | --- | --- | --- | ---- | ----------------------------------- |
| `ANCHOR_API_URL`            | string | —                 | O   | R   | R   | -    | Anchor service API endpoint         |
| `ANCHOR_API_KEY`            | string | —                 | O   | R   | R   | -    | Anchor API authentication key       |
| `ANCHOR_USDC_ASSET`         | string | —                 | O   | O   | R   | -    | USDC asset identifier on Stellar    |
| `SUPPORTED_FIAT_CURRENCIES` | string | `USD,EUR,GBP,NGN` | O   | O   | O   | -    | Comma-separated fiat currency codes |

---

## AWS S3 (Object Storage)

| Variable                | Type   | Default     | Dev | Stg | Prd | Test | Description      |
| ----------------------- | ------ | ----------- | --- | --- | --- | ---- | ---------------- |
| `AWS_ACCESS_KEY_ID`     | string | —           | O   | R   | R   | -    | S3 access key    |
| `AWS_SECRET_ACCESS_KEY` | string | —           | O   | R   | R   | -    | S3 secret key    |
| `AWS_REGION`            | string | `us-east-1` | O   | R   | R   | -    | S3 bucket region |
| `AWS_S3_BUCKET`         | string | —           | O   | R   | R   | -    | S3 bucket name   |

---

## IPFS / Pinata (Decentralised Storage)

| Variable         | Type   | Default                | Dev | Stg | Prd | Test | Description        |
| ---------------- | ------ | ---------------------- | --- | --- | --- | ---- | ------------------ |
| `PINATA_JWT`     | string | —                      | O   | O   | R   | -    | Pinata JWT API key |
| `PINATA_GATEWAY` | string | `gateway.pinata.cloud` | O   | O   | O   | -    | IPFS gateway URL   |

---

## Payment Processing

| Variable                     | Type   | Default | Dev | Stg | Prd | Test | Description                                       |
| ---------------------------- | ------ | ------- | --- | --- | --- | ---- | ------------------------------------------------- |
| `PAYMENT_GATEWAY`            | string | `mock`  | O   | R   | R   | -    | Active gateway: `mock`, `paystack`, `flutterwave` |
| `PAYSTACK_SECRET_KEY`        | string | —       | O   | R   | R   | -    | Paystack live secret key                          |
| `FLUTTERWAVE_SECRET_KEY`     | string | —       | O   | O   | O   | -    | Flutterwave secret key                            |
| `PAYMENT_GATEWAY_TIMEOUT_MS` | number | `10000` | O   | O   | O   | -    | Gateway request timeout                           |
| `PAYMENT_METADATA_SECRET`    | string | —       | O   | O   | O   | -    | Secret for payment metadata signing               |

---

## Email

| Variable         | Type   | Default | Dev | Stg | Prd | Test | Description                           |
| ---------------- | ------ | ------- | --- | --- | --- | ---- | ------------------------------------- |
| `EMAIL_SERVICE`  | string | `gmail` | O   | O   | O   | -    | Email provider: `gmail`, `smtp`       |
| `EMAIL_USER`     | string | —       | O   | R   | R   | -    | SMTP username / email address         |
| `EMAIL_PASSWORD` | string | —       | O   | R   | R   | -    | SMTP password / app-specific password |
| `EMAIL_FROM`     | string | —       | O   | R   | R   | -    | Sender email address                  |

---

## Frontend / CORS

| Variable             | Type    | Default                     | Dev | Stg | Prd | Test | Description                          |
| -------------------- | ------- | --------------------------- | --- | --- | --- | ---- | ------------------------------------ |
| `FRONTEND_URL`       | string  | `http://localhost:3000`     | O   | R   | R   | -    | Frontend application URL             |
| `PASSWORD_RESET_URL` | string  | —                           | O   | R   | R   | -    | Password reset link base URL         |
| `API_BASE_URL`       | string  | —                           | O   | O   | R   | -    | Public API base URL (production)     |
| `CORS_ORIGINS`       | string  | (derived from FRONTEND_URL) | O   | O   | R   | -    | Comma-separated allowed CORS origins |
| `CORS_CREDENTIALS`   | boolean | `true`                      | O   | O   | R   | -    | Allow CORS credentials               |

---

## Security

| Variable                  | Type         | Default    | Dev | Stg | Prd | Test | Description                            |
| ------------------------- | ------------ | ---------- | --- | --- | --- | ---- | -------------------------------------- |
| `SECURITY_ENCRYPTION_KEY` | string (hex) | —          | R   | R   | R   | R    | AES-256 key, exactly 64 hex characters |
| `SECURITY_CSRF_ENABLED`   | boolean      | `false`    | O   | R   | R   | -    | Enable CSRF token validation           |
| `SECURITY_SESSION_SECRET` | string       | —          | O   | R   | R   | -    | Session secret (≥32 characters)        |
| `SECURITY_HSTS_MAX_AGE`   | number       | `31536000` | O   | O   | R   | -    | HSTS header max-age in seconds         |
| `SECURITY_CSP_ENABLED`    | boolean      | `false`    | O   | O   | R   | -    | Enable Content Security Policy header  |

### Encryption (Field-Level)

| Variable                | Type            | Default | Dev | Stg | Prd | Test | Description                                          |
| ----------------------- | --------------- | ------- | --- | --- | --- | ---- | ---------------------------------------------------- |
| `ENCRYPTION_KEY_BASE64` | string (base64) | —       | O   | R   | R   | R    | AES-256-GCM key as 32-byte base64                    |
| `ENCRYPTION_KEYS`       | string (JSON)   | —       | O   | O   | O   | O    | JSON array for key rotation: `["new_key","old_key"]` |

---

## Logging

| Variable                     | Type        | Default   | Dev | Stg | Prd | Test | Description                                         |
| ---------------------------- | ----------- | --------- | --- | --- | --- | ---- | --------------------------------------------------- |
| `LOG_LEVEL`                  | string      | `info`    | R   | R   | R   | -    | Log level: `debug`, `info`, `warn`, `error`         |
| `LOG_FORMAT`                 | string      | `simple`  | O   | R   | R   | -    | Output format: `simple`, `json`                     |
| `LOG_SLOW_REQUEST_THRESHOLD` | number (ms) | `500`     | O   | O   | O   | -    | Log warning for requests exceeding this duration    |
| `LOG_SKIP_PATHS`             | string      | `/health` | O   | O   | O   | -    | Comma-separated paths excluded from request logging |
| `LOG_MAX_FILES`              | string      | `7d`      | O   | O   | O   | -    | Log retention (file count or duration like `7d`)    |
| `LOG_MAX_SIZE`               | string      | `10m`     | O   | O   | O   | -    | Max log file size before rotation (`10m`, `100m`)   |

---

## Monitoring / Observability

| Variable             | Type    | Default         | Dev | Stg | Prd | Test | Description                        |
| -------------------- | ------- | --------------- | --- | --- | --- | ---- | ---------------------------------- |
| `SENTRY_DSN`         | string  | —               | O   | O   | R   | -    | Sentry DSN for error tracking      |
| `SENTRY_ENVIRONMENT` | string  | (from NODE_ENV) | O   | O   | R   | -    | Sentry environment tag             |
| `METRICS_ENABLED`    | boolean | `false`         | O   | R   | R   | -    | Expose Prometheus metrics endpoint |
| `TRACING_ENABLED`    | boolean | `false`         | O   | O   | R   | -    | Enable distributed tracing         |

---

## Health Checks

| Variable                   | Type           | Default              | Dev | Stg | Prd | Test | Description                           |
| -------------------------- | -------------- | -------------------- | --- | --- | --- | ---- | ------------------------------------- |
| `HEALTH_CHECK_TIMEOUT`     | number (ms)    | `5000`               | O   | O   | O   | -    | Health check timeout for dependencies |
| `MEMORY_WARNING_THRESHOLD` | number (bytes) | `536870912` (512 MB) | O   | O   | O   | -    | Memory warning threshold              |
| `MEMORY_ERROR_THRESHOLD`   | number (bytes) | `1073741824` (1 GB)  | O   | O   | O   | -    | Memory error threshold                |

---

## Bull Job Queues

| Variable                              | Type        | Default | Dev | Stg | Prd | Test | Description                            |
| ------------------------------------- | ----------- | ------- | --- | --- | --- | ---- | -------------------------------------- |
| `BULL_QUEUE_EMAIL_ATTEMPTS`           | number      | `3`     | O   | O   | O   | -    | Max email job retry attempts           |
| `BULL_QUEUE_EMAIL_BACKOFF_DELAY`      | number (ms) | `2000`  | O   | O   | O   | -    | Email retry backoff delay              |
| `BULL_QUEUE_DOCUMENTS_ATTEMPTS`       | number      | `3`     | O   | O   | O   | -    | Max document processing retry attempts |
| `BULL_QUEUE_DOCUMENTS_BACKOFF_DELAY`  | number (ms) | `3000`  | O   | O   | O   | -    | Document retry backoff delay           |
| `BULL_QUEUE_BLOCKCHAIN_ATTEMPTS`      | number      | `5`     | O   | O   | O   | -    | Max blockchain job retry attempts      |
| `BULL_QUEUE_BLOCKCHAIN_BACKOFF_DELAY` | number (ms) | `5000`  | O   | O   | O   | -    | Blockchain retry backoff delay         |
| `BULL_QUEUE_DATA_SYNC_ATTEMPTS`       | number      | `3`     | O   | O   | O   | -    | Max data sync retry attempts           |
| `BULL_QUEUE_DATA_SYNC_BACKOFF_DELAY`  | number (ms) | `2000`  | O   | O   | O   | -    | Data sync retry backoff delay          |

---

## Admin Seed Configuration

| Variable                       | Type    | Default              | Dev | Stg | Prd | Test | Description                          |
| ------------------------------ | ------- | -------------------- | --- | --- | --- | ---- | ------------------------------------ |
| `ADMIN_DEFAULT_EMAIL`          | string  | `admin@chioma.local` | O   | O   | O   | -    | Default admin email for seeding      |
| `ADMIN_DEFAULT_FIRST_NAME`     | string  | `System`             | O   | O   | O   | -    | Default admin first name             |
| `ADMIN_DEFAULT_LAST_NAME`      | string  | `Administrator`      | O   | O   | O   | -    | Default admin last name              |
| `ADMIN_AUTO_GENERATE_PASSWORD` | boolean | `true`               | O   | O   | O   | -    | Auto-generate admin password on seed |

---

## Escrow Contract Configuration

| Variable                  | Type   | Default | Dev | Stg | Prd | Test | Description                     |
| ------------------------- | ------ | ------- | --- | --- | --- | ---- | ------------------------------- |
| `ESCROW_CONTRACT_ID`      | string | —       | O   | O   | R   | -    | Escrow Soroban contract address |
| `DEFAULT_ARBITER_ADDRESS` | string | —       | O   | O   | R   | -    | Default arbiter Stellar address |

---

## Dispute Resolution Contract

| Variable              | Type   | Default | Dev | Stg | Prd | Test | Description                          |
| --------------------- | ------ | ------- | --- | --- | --- | ---- | ------------------------------------ |
| `DISPUTE_CONTRACT_ID` | string | —       | O   | O   | R   | -    | Dispute resolution contract address  |
| `MIN_VOTES_REQUIRED`  | number | `3`     | O   | O   | O   | -    | Minimum votes for dispute resolution |
