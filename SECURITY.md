# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Chioma, please report it responsibly:

1. **Email**: security@chioma.io
2. **Do NOT** open a public GitHub issue for security vulnerabilities
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and will work with you to understand and resolve the issue.

## Security Features

### Authentication & Authorization

| Feature | Description |
|---------|-------------|
| JWT Authentication | Secure token-based authentication with access/refresh tokens |
| Multi-Factor Authentication | TOTP-based MFA with backup codes |
| Role-Based Access Control | LANDLORD, TENANT, AGENT, ADMIN roles |
| Account Lockout | Automatic lockout after 5 failed login attempts |
| Session Invalidation | All sessions invalidated on password change |
| Password Policy | Min 12 chars, uppercase, lowercase, number, special char |

### API Security

| Feature | Description |
|---------|-------------|
| Rate Limiting | 20 requests/minute global, 5/minute for auth endpoints |
| API Key Authentication | For external integrations with scopes (READ, WRITE, ADMIN) |
| Request Signing | HMAC-SHA256 signatures for sensitive operations |
| CORS | Strict origin validation in production |
| CSRF Protection | Double-submit cookie pattern for state-changing requests |

### Input Validation

| Feature | Description |
|---------|-------------|
| Sanitization Pipe | XSS prevention, HTML stripping, special char encoding |
| SQL Injection Guard | Pattern detection for common SQL injection attempts |
| Request Size Limits | 10KB for JSON, 50KB for URL-encoded, 5MB for files |
| File Upload Security | Extension whitelist, MIME validation, malware scanning |

### Data Protection

| Feature | Description |
|---------|-------------|
| Encryption at Rest | AES-256-GCM for sensitive fields |
| Password Hashing | bcrypt with 12 rounds |
| Log Sanitization | Automatic masking of passwords, tokens, emails, IPs |
| Secrets Management | Environment-based with AWS/Vault support |

### Security Headers

All responses include:
- `Content-Security-Policy`
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

### Compliance

- **GDPR**: Data export, deletion, consent management endpoints
- **CCPA**: Data portability and deletion rights
- **OWASP Top 10**: All categories addressed

## Configuration

### Required Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Optional Security Environment Variables

```env
# MFA Encryption (recommended for production)
MFA_ENCRYPTION_KEY=your-32-character-encryption-key

# Request Signing (for API integrations)
REQUEST_SIGNING_SECRET=your-signing-secret

# Secrets Provider (default: env)
SECRETS_PROVIDER=env|aws|vault

# For AWS Secrets Manager
AWS_REGION=us-east-1
AWS_SECRET_NAME=chioma/secrets

# For HashiCorp Vault
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token

# Security Contact (for security.txt)
SECURITY_CONTACT_EMAIL=security@chioma.io

# CORS (comma-separated origins)
ALLOWED_ORIGINS=https://chioma.io,https://app.chioma.io
```

## Security Endpoints

### Public
- `GET /.well-known/security.txt` - Security contact info (RFC 9116)
- `GET /robots.txt` - Disallows sensitive paths

### Authenticated
- `GET /api/security/headers` - Check security header configuration
- `POST /api/auth/mfa/setup` - Set up MFA
- `POST /api/auth/mfa/verify` - Verify MFA code
- `GET /api/users/me/privacy/data-export` - Export user data (GDPR)
- `POST /api/users/me/privacy/delete-request` - Request account deletion

### API Keys
- `POST /api/api-keys` - Create API key
- `GET /api/api-keys` - List API keys
- `DELETE /api/api-keys/:id` - Revoke API key

## Security Testing

### Automated Tests

```bash
# Run security-specific tests
cd backend && npm run test -- --testPathPattern=security

# Run OWASP E2E tests
cd backend && npm run test:e2e -- --testPathPattern=security
```

### Manual Testing Checklist

- [ ] Test XSS: `<script>alert('xss')</script>` in form fields
- [ ] Test SQL injection: `'; DROP TABLE users; --`
- [ ] Test rate limiting: >20 requests/minute
- [ ] Test CORS: Request from unauthorized origin
- [ ] Test authentication: Access protected endpoint without token
- [ ] Test MFA: Complete setup and verification flow
- [ ] Verify security headers: `curl -I https://api.chioma.io/health`

## CI/CD Security

- **Dependabot**: Automated dependency updates (weekly)
- **CodeQL**: Static analysis for JavaScript/TypeScript
- **Gitleaks**: Secret scanning
- **Trivy**: Container vulnerability scanning
- **npm audit**: Dependency vulnerability checks

## Database Schema (Security Fields)

### Users Table
```sql
mfa_enabled BOOLEAN DEFAULT false
mfa_secret VARCHAR(255)          -- Encrypted TOTP secret
mfa_backup_codes TEXT            -- Encrypted backup codes
password_history TEXT            -- Previous password hashes
password_changed_at TIMESTAMP
tokens_valid_after TIMESTAMP     -- For session invalidation
failed_login_attempts INTEGER
account_locked_until TIMESTAMP
```

### API Keys Table
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
name VARCHAR(100)
key_hash VARCHAR(255)            -- SHA-256 hashed key
key_prefix VARCHAR(10)           -- For identification (chi_xxx)
scopes VARCHAR(50)[]             -- READ, WRITE, ADMIN
is_active BOOLEAN
expires_at TIMESTAMP
last_used_at TIMESTAMP
rate_limit INTEGER
request_count INTEGER
```

## Incident Response

1. **Detection**: Security events logged via `SecurityAuditService`
2. **Assessment**: Review logs at `/api/admin/security-events`
3. **Containment**: Use admin endpoints to lock accounts/revoke tokens
4. **Recovery**: Follow documented recovery procedures
5. **Post-Incident**: Update security measures as needed

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-27 | Initial security implementation |

---

For questions about security, contact: security@chioma.io
