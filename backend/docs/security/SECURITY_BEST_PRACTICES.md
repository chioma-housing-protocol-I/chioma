# Security Best Practices

## Overview

This document defines security best practices for developing, deploying, and operating the Chioma platform. All engineers and contributors are expected to follow these practices when working with the codebase.

Use this document alongside:

- [Security Policies and Standards](./SECURITY_POLICIES_AND_STANDARDS.md)
- [Secrets Management](./SECRETS_MANAGEMENT.md)
- [Authorization Documentation](./AUTHORIZATION_DOCUMENTATION.md)
- [Audit Logging](./AUDIT_LOGGING.md)
- [Encryption](../encryption.md)

---

## Secure Development Lifecycle

### Principle of Least Privilege

- Code should run with the minimum permissions necessary.
- Database roles must be scoped per environment (read-only replicas for analytics, write-restricted for application).
- Service accounts and API tokens must be scoped to the minimum required resources and actions.
- Never grant blanket `SUPERUSER` or `ADMIN` access to application database users.

### Defense in Depth

Security is implemented at multiple layers:

| Layer          | Controls                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Network        | TLS 1.2+, ingress filtering, rate limiting, WAF                             |
| Application    | Input validation, authentication, authorization, CSRF protection            |
| Data           | Encryption at rest and in transit, hashed sensitive fields, audit trails    |
| Infrastructure | Secrets management, container isolation, least-privilege IAM policies       |
| Monitoring     | Threat detection, anomaly alerts, audit log analysis, Sentry error tracking |

### Secure by Default

- All endpoints require authentication unless explicitly marked as public.
- Deny-by-default for authorization — return `403` unless permission is explicitly granted.
- Validation rejects unexpected input — whitelist allowed values rather than blacklisting bad ones.
- Error responses must not leak internal implementation details, stack traces, or configuration values.

---

## Input Validation and Output Encoding

### Validation Rules

- Validate all input at the API boundary using DTOs with `class-validator` decorators.
- Enforce type, length, range, and format constraints on every field.
- Sanitize free-text fields to prevent XSS and injection attacks.
- Use parameterized queries for all database operations — never concatenate user input into SQL strings.

### File Upload Security

- Restrict upload file types to an allowlist (e.g., `image/jpeg`, `image/png`, `application/pdf`).
- Enforce maximum file size limits at the application and reverse proxy levels.
- Scan uploaded files for malware before storage.
- Store uploaded files outside the application root — serve via signed URLs or a dedicated CDN.
- Validate MIME types server-side — never trust the `Content-Type` header alone.

### API Security

- Enforce rate limiting on all endpoints, with stricter limits on auth-related routes.
- Apply CSRF protection for state-changing requests using double-submit cookie pattern.
- Set security headers via Helmet: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`.
- Limit request body size (1 MB default for JSON/URL-encoded payloads).
- Validate and sanitize webhook payloads using signature verification where providers support it.

---

## Authentication Best Practices

- Use JWT access tokens with short expiration (15 minutes).
- Use HttpOnly, Secure, SameSite cookies for refresh tokens.
- Implement account lockout after repeated failed login attempts.
- Require MFA for administrative accounts and high-value operations.
- Never store passwords in plaintext — use bcryptjs with a cost factor of 12 or higher.
- Rotate JWT signing keys every 90 days.
- Log all authentication events (success, failure, lockout, MFA changes).

---

## Authorization Best Practices

- Apply `@UseGuards(JwtAuthGuard, RolesGuard)` on all privileged routes.
- Use `@RequirePermission(...)` for fine-grained access control where multiple roles share a resource.
- Audit all authorization failures — sustained `403` spikes may indicate scanning or misconfiguration.
- Review and synchronize RBAC seeds with route-level guards whenever new features ship.

---

## Data Protection Best Practices

### Sensitive Data

- Identify and classify all sensitive data fields (PII, financial, KYC).
- Encrypt sensitive fields at rest using AES-256-GCM via `EncryptionService`.
- Use HMAC-SHA256 hashed lookup columns for exact-match queries on encrypted data.
- Never log raw passwords, tokens, encryption keys, KYC payloads, or full payment card numbers.
- Minimize data collection — only store what the feature requires.

### Encryption Key Management

- Use multiple active encryption keys to support rotation without downtime.
- Store keys in environment variables or AWS Secrets Manager — never in source code.
- Keep previous key versions available during rotation transitions for decryption fallback.
- Rotate encryption keys every 90 days and on any suspected compromise.

---

## Dependency Security Best Practices

- Run `pnpm audit` regularly and before every release.
- Use `pnpm.overrides` to pin transitive dependencies with known vulnerabilities when a direct upgrade is not available.
- Isolate security-critical dependency updates in dedicated PRs.
- Monitor the `SecurityPatchManagementService` daily cron output (runs at 02:00 daily).
- Remove unused dependencies to reduce the attack surface.
- Review new dependencies for license compatibility and maintainability before adding them.

---

## Infrastructure Security Best Practices

### Container Security

- Run containers as a non-root user (the Dockerfile creates a `node` user).
- Use multi-stage builds to minimize image size and exclude build-time tools.
- Scan container images with Trivy or similar tools before deployment.
- Pin base image versions — avoid `latest` tags in production.
- Enable read-only root filesystem where possible.

### Database Security

- Use separate database credentials per environment.
- Restrict network access to the database — only allow connections from the application tier.
- Enable TLS for database connections in transit.
- Disable `synchronize` in TypeORM for staging and production — use explicit migrations only.
- Back up databases regularly and test restore procedures monthly.
- Encrypt database backups at rest.

### Network Security

- Terminate TLS at the load balancer or ingress.
- Restrict inbound traffic to necessary ports only (80, 443, and management ports).
- Use a web application firewall (WAF) to filter common attack patterns.
- Enable DDoS protection at the infrastructure level.

---

## Logging and Monitoring Best Practices

- Log all authentication and authorization events for audit purposes.
- Never log secrets, PII payloads, or sensitive financial data.
- Use structured JSON logging with correlation IDs for cross-service tracing.
- Ship logs to a centralized platform (Loki/ELK) for analysis and alerting.
- Configure alerts for:
  - Sustained 5xx error rate above threshold
  - Authentication failure spikes
  - Authorization failure spikes
  - Security event volume anomalies
  - Audit log pipeline silence

---

## Incident Response Best Practices

- Follow the incident response procedures in [INCIDENT_RESPONSE.md](../INCIDENT_RESPONSE.md).
- Document all incidents with:
  - Incident identifier and timeline
  - Affected systems and data classes
  - Containment steps taken
  - Recovery verification evidence
  - Preventive action items with owners
- Conduct post-incident reviews within 72 hours of resolution.
- Test the incident response plan quarterly through tabletop exercises.

---

## Security Testing Best Practices

### Automated Testing

- Run security-focused linting as part of CI (`make security-lint`).
- Execute security smoke tests in CI (`make security-test`).
- Run `pnpm audit` in CI to catch vulnerable dependencies before merge.
- Include security test cases in the general test suite — test for authentication bypass, authorization bypass, input validation, and idempotency.

### Manual Testing

- Conduct penetration testing before major releases and at least annually.
- Perform code review with security focus for changes touching auth, payments, KYC, or data encryption.
- Review third-party integration trust boundaries and secret handling.

---

## Compliance Best Practices

- Ensure audit logging covers all GDPR/SOC 2/PCI-DSS required event types.
- Support data subject access requests (DSAR) through the compliance service.
- Encrypt personal data at rest and in transit.
- Maintain data retention and deletion policies aligned with regulatory requirements.
- Document data flows and processing purposes for all personal data collected.

---

## Security Checklist for Code Changes

Before submitting any PR, verify:

- [ ] No secrets, credentials, or tokens committed to source control
- [ ] Authentication is enforced on all new protected routes
- [ ] Role or permission checks cover new sensitive operations
- [ ] Input payloads are validated and sanitized via DTOs
- [ ] Sensitive data is encrypted or hashed before storage
- [ ] Audit logs are emitted for privileged or security-relevant changes
- [ ] Rate limiting and abuse protections are considered
- [ ] Error responses do not leak internal implementation details
- [ ] New integrations document their trust boundaries and secret handling
- [ ] Dependencies are scanned for known vulnerabilities
- [ ] Security linting passes (`make security-lint`)
- [ ] Security smoke tests pass (`make security-test`)
- [ ] The change has been reviewed by at least one other engineer

---

## Related Documentation

- [Security Policies and Standards](./SECURITY_POLICIES_AND_STANDARDS.md)
- [Secrets Management](./SECRETS_MANAGEMENT.md)
- [Authorization Documentation](./AUTHORIZATION_DOCUMENTATION.md)
- [Audit Logging](./AUDIT_LOGGING.md)
- [Encryption](../encryption.md)
- [Incident Response](../INCIDENT_RESPONSE.md)
- [Vulnerability Management](./VULNERABILITY_MANAGEMENT.md)
