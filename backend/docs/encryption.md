# Encryption at Rest and in Transit

Chioma uses AES-256-GCM authenticated encryption for data at rest and enforces
TLS 1.2/1.3 for all data in transit.

---

## Data at Rest

### Common EncryptionService (`src/common/services/encryption.service.ts`)

General-purpose service used across the application for encrypting arbitrary
strings (e.g. tokens, secrets, user preferences).

**Algorithm:** AES-256-GCM (authenticated — detects tampering via auth tag)  
**IV:** 12 random bytes per encryption call  
**Output format:** JSON envelope `{ iv, data, tag }` — all base64

**Environment variables:**

```
# Single key (base64-encoded 32 bytes)
ENCRYPTION_KEY_BASE64=<base64>

# OR multiple keys for rotation (JSON array, newest first)
ENCRYPTION_KEYS=["<new_key_base64>","<old_key_base64>"]
```

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Key rotation:** Prepend the new key to `ENCRYPTION_KEYS`. Decryption tries
keys in order so old ciphertexts remain readable until re-encrypted.

---

### Security EncryptionService (`src/modules/security/encryption.service.ts`)

Used for PII and financial data. Derives a per-record key from the master key
using PBKDF2 (310 000 iterations, SHA-256) so that each encrypted value has a
unique derived key even when the master key is the same.

**Algorithm:** AES-256-GCM  
**Key derivation:** PBKDF2-SHA256, 310 000 iterations, 64-byte random salt  
**Output format:** base64 blob — `salt | iv | authTag | ciphertext`

**Environment variables:**

```
# Single 64-char hex key (32 bytes)
SECURITY_ENCRYPTION_KEY=<64 hex chars>

# OR comma-separated keys for rotation (current first)
SECURITY_ENCRYPTION_KEYS=<new_hex_key>,<old_hex_key>
```

Generate a key:

```bash
openssl rand -hex 32
```

Additional utilities on this service:

| Method                              | Purpose                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `hash(value)`                       | HMAC-SHA256 deterministic hash for indexed lookups on encrypted fields |
| `generateSecureToken(bytes)`        | Cryptographically random hex token                                     |
| `generateSignedToken(payload, ttl)` | Time-limited HMAC-signed token (webhooks, signed URLs)                 |
| `verifySignedToken(token, payload)` | Constant-time verification of signed tokens                            |

---

### TypeORM Column Transformer (`src/modules/security/transformers/encryption.transformer.ts`)

Transparently encrypts/decrypts individual database columns via TypeORM's
`ValueTransformer` interface. Uses the same PBKDF2 + AES-256-GCM algorithm as
the Security EncryptionService.

**Environment variable:** `SECURITY_ENCRYPTION_KEY` (same as above)

Usage on an entity column:

```ts
import { EncryptionTransformer } from '../security/transformers/encryption.transformer';

@Column({ transformer: EncryptionTransformer })
sensitiveField: string;
```

---

### KYC Field-Level Encryption (`src/modules/kyc/kyc-encryption.util.ts`)

Encrypts individual sensitive fields within a KYC payload before the outer
document is stored. Sensitive fields:

```
first_name, last_name, date_of_birth, address, city, state,
postal_code, country, id_number, tax_id, phone_number,
bank_account_number, bank_routing_number
```

The outer KYC document is additionally encrypted by the TypeORM
`EncryptionTransformer`, giving two layers of encryption for the most sensitive
data.

---

## Data in Transit

### TLS (Nginx)

All external traffic is terminated at Nginx (`backend/nginx/nginx.conf`):

- HTTP (port 80) → 301 redirect to HTTPS
- HTTPS (port 443) with TLS 1.2 and TLS 1.3 only
- OCSP stapling enabled
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)

### Security Headers (`src/common/middleware/security-headers.middleware.ts`)

Applied to every response via Helmet:

| Header                      | Value                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (+ `preload` in production) |
| `X-Content-Type-Options`    | `nosniff`                                                         |
| `X-Frame-Options`           | `DENY`                                                            |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                 |
| `Permissions-Policy`        | `geolocation=(), microphone=(), camera=()`                        |

Configure via environment:

```
SECURITY_HSTS_MAX_AGE=31536000   # seconds (default: 1 year)
SECURITY_CSP_ENABLED=true        # enable Content-Security-Policy
```

---

## Key Management

| Concern           | Recommendation                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Storage           | AWS Secrets Manager (`DB_ENCRYPTION_SECRET_ID`) or HashiCorp Vault                                        |
| Rotation          | Prepend new key to `ENCRYPTION_KEYS` / `SECURITY_ENCRYPTION_KEYS`; re-encrypt at rest on next write cycle |
| Minimum length    | 32 bytes (256 bits)                                                                                       |
| Never commit keys | Use `.env` files excluded from git or inject via CI secrets                                               |

The `DatabaseEncryptionKeyService` (`src/modules/security/database-encryption-key.service.ts`)
fetches the active key from AWS Secrets Manager when `DB_ENCRYPTION_SECRET_ID`
is set, falling back to `DB_ENCRYPTION_KEY` for local development.

---

## Testing

Run the dedicated encryption test suite:

```bash
# Unit tests only (no DB required)
pnpm exec jest --runInBand "src/common/__tests__/encryption-at-rest-and-in-transit.spec.ts"

# Full CI pipeline
make ci
```

The spec covers:

- AES-256-GCM encrypt/decrypt round-trips
- Tamper detection (auth tag)
- Key rotation fallback
- PBKDF2 key derivation
- TypeORM transformer
- KYC field-level encryption
- HSTS header presence
- Cryptographic primitive sanity checks
