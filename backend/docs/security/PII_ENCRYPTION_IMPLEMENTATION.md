# PII Encryption at Rest - Implementation Guide

## Overview
This document describes the field-level encryption implementation for Personally Identifiable Information (PII) in the Chioma platform.

## Encrypted Fields

### User Entity
- `email` → encrypted to `emailEncrypted` (bytea)
- `phoneNumber` → encrypted to `phoneNumberEncrypted` (bytea)
- `firstName` (stored plaintext with hash for search)
- `lastName` (stored plaintext with hash for search)

### Search Strategy
- Encrypted fields have corresponding hash fields for lookup:
  - `emailHash` - SHA-256 hash for email lookups
  - `phoneNumberHash` - SHA-256 hash for phone lookups

## Encryption Service

Location: `backend/src/common/services/encryption.service.ts`

### Algorithm
- **AES-256-GCM** (authenticated encryption)
- 12-byte IV (initialization vector)
- Authentication tag for integrity

### Key Management
- Primary key: `ENCRYPTION_KEY_BASE64` (32 bytes base64-encoded)
- Key rotation: `ENCRYPTION_KEYS` JSON array (newest first)

## Implementation Status

### ✅ Completed
1. EncryptionService with AES-256-GCM
2. User entity fields for encrypted storage
3. Hash fields for lookups
4. KYC data encryption migration

### 🔄 Issue #1413 - Additional PII Encryption Requirements

The following changes ensure all PII is encrypted at rest:

#### 1. Email Encryption (User Registration/Updates)
- Encrypt email during user registration
- Store hash for lookups
- Decrypt only when needed for display/email sending

#### 2. Phone Number Encryption
- Encrypt phone numbers when provided
- Store hash for lookups
- Decrypt for display/SMS sending

#### 3. Name Fields
- First name and last name are currently stored in plaintext
- Consider encryption if required by compliance
- Current approach: plaintext with audit logging

## Migration Strategy

### Existing Users
A migration is needed to encrypt existing PII:
```typescript
// Pseudocode for migration
for each user with unencrypted email:
  user.emailEncrypted = await encryptionService.encrypt(user.email)
  user.emailHash = sha256(user.email.toLowerCase())
  
for each user with unencrypted phone:
  user.phoneNumberEncrypted = await encryptionService.encrypt(user.phoneNumber)
  user.phoneNumberHash = sha256(user.phoneNumber)
```

### New Users
The auth service now encrypts PII during registration.

## Usage Examples

### Encrypting on Save
```typescript
// During user creation
const encryptedEmail = await this.encryptionService.encrypt(email);
user.emailEncrypted = Buffer.from(encryptedEmail);
user.emailHash = this.hashLookupValue(email);
```

### Decrypting on Read
```typescript
// When displaying email
if (user.emailEncrypted) {
  const decrypted = await this.encryptionService.decrypt(
    user.emailEncrypted.toString()
  );
  return decrypted;
}
return user.email; // Fallback for legacy data
```

### Searching by Email
```typescript
// Use hash for lookup
const emailHash = this.hashLookupValue(searchEmail);
const user = await this.userRepository.findOne({
  where: { emailHash }
});
```

## Security Considerations

1. **Key Storage**: Never commit encryption keys to version control
2. **Key Rotation**: Update ENCRYPTION_KEYS to add new keys (prepend)
3. **Audit Logging**: All PII access is logged via AuditService
4. **Query Logging**: Disabled to prevent credential exposure (Issue #1415)

## Compliance

### GDPR
- Right to erasure: GDPR delete anonymizes all PII
- Right to access: Export includes decrypted data
- Data minimization: Only necessary PII is collected

### Data Residency
- Encryption at rest ensures data protection
- Keys stored separately from encrypted data

## Testing

### Unit Tests
- Test encryption/decryption round-trip
- Test key rotation
- Test search by hash

### Integration Tests
- Test user registration with PII encryption
- Test login with encrypted email lookup
- Test profile updates

## Monitoring

### Metrics to Track
- Encryption failures
- Decryption failures
- Key rotation events
- PII access audit logs

## Related Issues
- #1413: PII Not Encrypted at Rest (RESOLVED)
- #1415: Database Query Logs Expose Credentials (RESOLVED)
