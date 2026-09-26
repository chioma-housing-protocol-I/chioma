# Secrets Management

## Overview

This document defines how Chioma stores, accesses, rotates, and audits secrets
across all environments. Secrets include API keys, database credentials,
encryption keys, JWT signing material, webhook secrets, and any other sensitive
configuration values.

Use this document alongside:

- `backend/docs/security/SECURITY_POLICIES_AND_STANDARDS.md`
- `backend/docs/encryption.md`
- `backend/docs/security/AUDIT_LOGGING.md`

---

## Table of Contents

- [Secret Types](#secret-types)
- [Secrets Storage](#secrets-storage)
- [Access Control](#access-control)
- [Secret Rotation](#secret-rotation)
- [Encryption](#encryption)
- [Audit Logging](#audit-logging)
- [Recovery Procedures](#recovery-procedures)
- [Secrets Management Checklist](#secrets-management-checklist)
- [Troubleshooting](#troubleshooting)

---

## Secret Types

| Type                    | Examples                                                    | Sensitivity |
| ----------------------- | ----------------------------------------------------------- | ----------- |
| Database credentials    | `DATABASE_URL`, `DB_ENCRYPTION_SECRET_ID`                   | Critical    |
| Encryption keys         | `SECURITY_ENCRYPTION_KEYS`, `SECURITY_ENCRYPTION_KEY`       | Critical    |
| JWT signing material    | `JWT_SECRET`, `JWT_REFRESH_SECRET`                          | Critical    |
| Third-party API keys    | Stellar anchor keys, tenant screening provider keys         | High        |
| Webhook secrets         | `TENANT_SCREENING_WEBHOOK_SECRET`, payment callback secrets | High        |
| Service account tokens  | CI/CD tokens, deployment credentials                        | High        |
| Internal service tokens | Queue credentials, cache passwords                          | Medium      |

---

## Secrets Storage

### Environment Variables

All secrets are injected at runtime via environment variables. They must never
be hardcoded in source files, committed to version control, or written to
application logs.

```
# .env (local development only — never committed)
DATABASE_URL=postgresql://...
JWT_SECRET=...
SECURITY_ENCRYPTION_KEYS=...
```

`.env` files are listed in `.gitignore`. Use `.env.example` with placeholder
values to document required variables without exposing real secrets.

### AWS Secrets Manager (Production)

In production, secrets are stored in AWS Secrets Manager and referenced by
secret ID. The application resolves them at startup via the AWS SDK.

- `DB_ENCRYPTION_SECRET_ID` — resolves the active database encryption key
- Secrets are versioned; previous versions are retained for rotation fallback
- Access is restricted to the application's IAM role via least-privilege policy

### Local Development

Use a `.env` file populated from the team's shared secret store (e.g., 1Password,
Bitwarden, or an internal vault). Never share secrets over chat or email.

---

## Access Control

- secrets are scoped to the environment that needs them (dev, staging, production)
- production secrets are accessible only to the application's runtime IAM role and designated security leads
- no developer should have standing read access to production encryption keys or database credentials
- CI/CD pipelines receive only the secrets required for the pipeline step being executed
- secret access is logged and reviewed periodically

---

## Secret Rotation

### Rotation Schedule

| Secret type          | Rotation frequency                      |
| -------------------- | --------------------------------------- |
| Encryption keys      | Every 90 days                           |
| JWT signing keys     | Every 90 days                           |
| Database credentials | Every 90 days                           |
| Third-party API keys | Per provider policy or every 180 days   |
| Webhook secrets      | On suspected exposure or every 180 days |

### Rotation Procedure

1. Generate the new secret value using a cryptographically secure method.
2. Add the new value to the secret store alongside the old value (do not delete yet).
3. Deploy the updated configuration so the application picks up the new value.
4. For encryption keys, add the new key to `SECURITY_ENCRYPTION_KEYS` and keep
   the old key present for decryption fallback. Re-encrypt data in a background
   migration if required.
5. Verify the application is operating correctly with the new secret.
6. Remove the old secret value after the safe-window period has passed.
7. Record the rotation event in the audit log.

### Emergency Rotation

If a secret is suspected to be compromised:

1. Immediately revoke or disable the exposed secret at the source.
2. Generate and deploy a replacement following the rotation procedure above.
3. Review audit logs for unauthorized access during the exposure window.
4. File an incident report and notify affected parties if data was accessed.

---

## Encryption

- secrets at rest in AWS Secrets Manager are encrypted using AWS KMS
- application-level encryption uses AES-256-GCM via `EncryptionService`
- encryption keys are never stored in plaintext alongside the data they protect
- key derivation uses PBKDF2 with a per-value salt
- HMAC-SHA256 is used for deterministic lookup hashes on encrypted fields

See `backend/docs/encryption.md` for implementation details.

---

## Audit Logging

All secret access and rotation events must be logged. Minimum fields:

- timestamp
- actor (user ID, service account, or IAM role)
- action (`secret.read`, `secret.rotated`, `secret.created`, `secret.deleted`)
- secret identifier (name or ID — never the value)
- outcome (`success` / `failure`)
- source IP or request context

Audit logs for secret operations must be stored separately from application logs
and protected against tampering. See `backend/docs/security/AUDIT_LOGGING.md`.

---

## Recovery Procedures

### Lost or Corrupted Encryption Key

1. Identify the key version from the encrypted data's metadata.
2. Retrieve the key from AWS Secrets Manager version history.
3. If the key is unrecoverable, assess which data is affected and notify
   stakeholders per the incident response process.
4. Restore from the most recent backup that predates the key loss.

### Expired or Revoked API Key

1. Generate a new key from the provider's dashboard.
2. Update the secret in the secret store.
3. Redeploy or hot-reload the configuration.
4. Verify dependent integrations are functioning.

### Compromised Database Credentials

1. Immediately rotate the database password.
2. Terminate active sessions using the old credentials.
3. Update the secret store and redeploy.
4. Review database access logs for the exposure window.

---

## Secrets Management Checklist

- [ ] no secrets committed to source control
- [ ] `.env` is in `.gitignore`; `.env.example` uses placeholder values
- [ ] all production secrets stored in AWS Secrets Manager
- [ ] encryption keys versioned and rotation schedule documented
- [ ] least-privilege IAM policies applied to secret access
- [ ] secret rotation procedure tested in staging before production
- [ ] audit logging enabled for all secret access and rotation events
- [ ] emergency rotation procedure documented and accessible to on-call team
- [ ] recovery procedure tested for encryption key and credential loss scenarios
- [ ] CI/CD pipelines scoped to only the secrets they require

---

## Troubleshooting

### Application fails to start — missing secret

Check that all required environment variables are present. Compare against
`.env.example`. In production, verify the IAM role has `secretsmanager:GetSecretValue`
permission for the relevant secret ARN.

### Decryption failure after key rotation

Ensure the old key is still present in `SECURITY_ENCRYPTION_KEYS` during the
transition window. The encryption service supports multiple active keys for
exactly this scenario.

### Unexpected secret access in audit log

Treat as a potential incident. Identify the actor, review the access pattern,
and rotate the affected secret if unauthorized access cannot be ruled out.

### Third-party API key rejected

Verify the key has not expired or been revoked by the provider. Check the
provider's dashboard for usage anomalies before rotating.
