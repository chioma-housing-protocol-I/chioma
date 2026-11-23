# Security Testing Guide

This guide covers security testing practices for the Chioma platform, including authentication, authorization, data protection, and smart contract security.

## Overview

Security testing in Chioma spans three layers:

1. **Backend API Security** - Authentication, authorization, input validation, rate limiting
2. **Smart Contract Security** - On-chain escrow, payment flows, access control
3. **Infrastructure Security** - TLS/SSL, secrets management, network security

## Backend Security Testing

### Authentication Tests

Authentication tests verify:
- Valid token acceptance
- Invalid/expired token rejection
- Token refresh flows
- Session management
- Multi-factor authentication (if implemented)

**Location**: `backend/test/auth.e2e-spec.ts`, `backend/test/stellar-auth*.e2e-spec.ts`

**Example**:
```typescript
it('should reject requests with expired tokens', async () => {
  const expiredToken = generateExpiredToken();
  
  return request(app.getHttpServer())
    .get('/protected-resource')
    .set('Authorization', `Bearer ${expiredToken}`)
    .expect(401);
});
```

### Authorization Tests (RBAC)

Authorization tests ensure role-based access control:
- User role permissions (tenant, landlord, agent, admin)
- Resource ownership validation
- Permission boundaries

**Reference**: See `backend/RBAC_GUIDE.md` for the authorization model.

**Example**:
```typescript
describe('Property access control', () => {
  it('should allow landlord to update their own property', async () => {
    // Test implementation
  });
  
  it('should prevent tenant from updating property details', async () => {
    // Test implementation
  });
});
```

### Input Validation Tests

Input validation prevents injection attacks and malformed data:
- SQL injection attempts
- XSS payload rejection
- Schema validation
- Request size limits

**Example**:
```typescript
it('should reject SQL injection in search query', async () => {
  const maliciousInput = "'; DROP TABLE properties; --";
  
  return request(app.getHttpServer())
    .get(`/properties/search?q=${encodeURIComponent(maliciousInput)}`)
    .expect(400);
});
```

### Rate Limiting Tests

Rate limiting tests verify throttling mechanisms:
- Request rate limits per endpoint
- API key quota enforcement
- Burst protection

**Location**: `backend/test/rate-limiting.e2e-spec.ts`, `backend/test/api-throttling-integration.e2e-spec.ts`

## Smart Contract Security Testing

### Access Control Tests

Smart contract tests verify on-chain permissions:
- Contract initialization restrictions
- Function-level access control
- Admin privilege separation

**Location**: `contract/contracts/*/src/tests.rs`

**Example** (Rust):
```rust
#[test]
fn test_unauthorized_access_rejected() {
    let env = Env::default();
    let contract_id = env.register_contract(None, EscrowContract);
    let unauthorized_user = Address::generate(&env);
    
    // Attempt unauthorized operation
    let result = client.release_funds(&unauthorized_user);
    assert!(result.is_err());
}
```

### Escrow Security Tests

Escrow tests validate secure fund holding:
- Funds cannot be withdrawn prematurely
- Multi-signature requirements enforced
- Timeout mechanisms work correctly
- Partial release edge cases

**Reference**: See `contract/docs/testing/INTEGRATION-TESTS.md`

### Payment Flow Security

Payment flow tests ensure:
- Atomic fund transfers
- Commission splitting correctness
- Refund mechanisms
- Double-spend prevention

## Cryptographic Security

### Stellar Transaction Signing

Tests for transaction signing:
- Valid signatures accepted
- Invalid signatures rejected
- Multi-sig threshold enforcement
- Replay attack prevention

### Secret Management

Secret handling tests:
- Environment variable masking in logs
- Secure key storage verification
- Rotation procedures

**Reference**: See `docs/secrets-scanning.md`

## Security Scanning

### Automated Scanning Tools

The project uses:
- **Gitleaks** - Secret detection (`.gitleaks.toml`, `.gitleaksignore`)
- **Dependabot** - Dependency vulnerability scanning (`.github/dependabot.yml`)
- **GitHub Secret Scanning** - Credential leak detection

**Workflow**: `.github/workflows/secrets-scan.yml`

### Manual Security Reviews

Security-sensitive code requires:
- Peer review by at least 2 developers
- Security-focused checklist review
- Architecture Decision Record (ADR) for auth/crypto changes

**Reference**: See `docs/adr/` for security-related ADRs

## Common Security Test Patterns

### Testing for Information Disclosure

```typescript
it('should not leak internal error details to clients', async () => {
  // Trigger internal error
  const response = await request(app.getHttpServer())
    .post('/sensitive-operation')
    .send({ malformed: 'data' })
    .expect(500);
    
  // Verify generic error message
  expect(response.body.message).not.toContain('database');
  expect(response.body.message).not.toContain('stack trace');
});
```

### Testing for CSRF Protection

```typescript
it('should require CSRF token for state-changing operations', async () => {
  return request(app.getHttpServer())
    .post('/property-listings')
    .send(validPropertyData)
    .expect(403); // Missing CSRF token
});
```

### Testing for CORS Configuration

**Location**: `backend/test/cors-security-headers.e2e-spec.ts`

```typescript
it('should reject requests from unauthorized origins', async () => {
  return request(app.getHttpServer())
    .get('/api/properties')
    .set('Origin', 'https://malicious-site.com')
    .expect(403);
});
```

## Security Test Data

### Test Users and Roles

Security tests use predefined test accounts:
- `test-admin@example.com` - Admin role
- `test-landlord@example.com` - Landlord role
- `test-tenant@example.com` - Tenant role
- `test-agent@example.com` - Agent role

**Location**: `backend/src/database/seeds/seed-scenarios.ts`

### Test Wallets

Smart contract tests use generated Stellar keypairs:
- Never use mainnet credentials in tests
- Generate fresh keypairs per test run
- Use testnet/standalone network only

## Running Security Tests

```bash
# Backend security test suite
cd backend
pnpm test:e2e -- --testNamePattern="security|auth|authorization"

# Smart contract security tests
cd contract
cargo test -- --test-threads=1

# Secret scanning
gitleaks detect --source . --verbose

# Dependency audit
cd backend && pnpm audit
cd frontend && pnpm audit
```

## Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Follow the responsible disclosure process in `SECURITY.md`:
- Use GitHub private vulnerability reporting
- Or email: security@chioma.dev
- Expected response time: 48 hours

## Further Reading

- [SECURITY.md](../SECURITY.md) - Security policy and vulnerability reporting
- [backend/RBAC_GUIDE.md](../backend/RBAC_GUIDE.md) - Role-based access control
- [backend/CORS_GUIDE.md](../backend/CORS_GUIDE.md) - CORS configuration
- [docs/secrets-scanning.md](secrets-scanning.md) - Secret detection setup
- [contract/docs/testing/TESTING-STRATEGY.md](../contract/docs/testing/TESTING-STRATEGY.md) - Smart contract testing
