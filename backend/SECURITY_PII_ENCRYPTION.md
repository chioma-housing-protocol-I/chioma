# PII Field-Level Encryption

## Overview
Personally Identifiable Information (PII) is encrypted at rest using AES-256-GCM encryption via the centralized `EncryptionService`.

## Encrypted Fields

### User Entity
The following PII fields are encrypted in the database:
- `email` → `email_encrypted`
- `firstName` → `first_name_encrypted`
- `lastName` → `last_name_encrypted`
- `phoneNumber` → `phone_number_encrypted`
- `walletAddress` → `wallet_address_encrypted`

### Hash Fields
For searchable fields, SHA-256 hashes are stored separately:
- `email_hash`
- `phone_number_hash`
- `wallet_address_hash`

## Implementation Details

### Encryption Service
The `EncryptionService` provides:
- AES-256-GCM authenticated encryption
- Key rotation support (multiple keys)
- Base64-encoded encrypted output with IV and auth tag
- Automatic key version tracking

### Database Schema
Encrypted fields use:
- PostgreSQL: `BYTEA` type
- SQLite: `BLOB` type
- All encrypted fields have `select: false` to prevent accidental exposure

### Service Layer Integration
The `UsersService` automatically encrypts PII on:
- Profile updates (`updateProfile`)
- Email changes (`changeEmail`)
- User creation (via auth service)

### Audit Trail
All PII access is logged via the `AuditService` with:
- Action type (PII_UPDATE, EMAIL_CHANGE)
- Field names accessed
- User who performed the action
- Security level classification

## Migrations

### 1910000000000-AddUserPiiEncryptionFields
Adds encrypted columns for firstName and lastName to the users table.

### 1910000000001-EncryptExistingUserPiiData
Encrypts existing PII data in the database:
- Iterates through all users with PII
- Encrypts each field using the current encryption key
- Updates encryption key version to 1
- Continues on individual user failures (logs errors)

## Key Management

### Environment Variables
- `ENCRYPTION_KEY_BASE64`: Single 32-byte base64-encoded key (fallback)
- `ENCRYPTION_KEYS`: JSON array of base64 keys for rotation (newest first)

### Key Rotation
To rotate encryption keys:
1. Add new key to `ENCRYPTION_KEYS` array (prepend as newest)
2. New data will be encrypted with the new key
3. Old data can be decrypted with any key in the rotation list
4. Optionally migrate old data to use new key

### Security Requirements
- Keys must be 32 bytes (base64 ~44 characters)
- Keys must not use placeholder values in production
- Keys should be stored in secure environment (AWS SSM, Vault, etc.)

## Testing

### Encryption/Decryption Round-Trip
```typescript
const original = 'test@example.com';
const encrypted = await encryptionService.encrypt(original);
const decrypted = await encryptionService.decrypt(encrypted);
assert(decrypted === original);
```

### Database Verification
- Verify encrypted fields contain non-readable data
- Verify hash fields contain consistent SHA-256 hashes
- Verify plain text fields remain for backward compatibility

## Compliance
This implementation supports:
- GDPR data protection requirements
- PCI DSS encryption requirements
- Data breach protection (encrypted data useless without keys)
