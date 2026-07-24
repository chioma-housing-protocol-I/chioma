# Security Audit and Best Practices

## Executive Summary

This document outlines the security audit findings, best practices, authorization patterns, input validation strategies, emergency procedures, and security testing methodologies for the Chioma platform. The platform implements defense-in-depth security with multiple layers of protection across authentication, authorization, data protection, and operational security.

## Security Audit Findings

### Audit Scope

**Components Audited**:

- Authentication & Authorization (JWT, SEP-0010, MFA)
- API Security (Rate limiting, CORS, CSRF protection)
- Data Protection (Encryption, PII handling)
- Database Security (SQL injection prevention, access control)
- Blockchain Integration (Stellar, escrow security)
- Infrastructure Security (Docker, secrets management)
- Dependency Security (Vulnerability scanning)

**Audit Date**: Q1 2024
**Status**: Passed with recommendations

### Critical Findings

**None** - No critical security vulnerabilities identified

### High Priority Findings

**1. Secrets Management**

- **Issue**: Environment variables stored in `.env` files
- **Risk**: Accidental exposure in version control
- **Mitigation**:
  - Use GitHub Secrets for CI/CD
  - Use AWS Secrets Manager for production
  - Implement secret rotation policy
  - Add `.env` to `.gitignore`

**2. Rate Limiting**

- **Issue**: Rate limiting not enforced on all endpoints
- **Risk**: Brute force attacks, DoS
- **Mitigation**:
  - Implement global rate limiting middleware
  - Configure per-endpoint limits
  - Use Redis for distributed rate limiting
  - Monitor for abuse patterns

**3. CORS Configuration & Security Headers**

- **Issue**: CORS allows all origins in development and missing security headers
- **Risk**: Cross-origin attacks, clickjacking, XSS
- **Mitigation** (Implemented):
  - Strict CORS configured based on environment variables
  - Helmet middleware added for HSTS, Content Security Policy, and X-Frame-Options
  - E2E tests added to ensure continuous validation

### Medium Priority Findings

**1. Audit Logging**

- **Issue**: Not all sensitive operations logged
- **Risk**: Inability to detect unauthorized access
- **Mitigation**:
  - Log all authentication attempts
  - Log all authorization failures
  - Log all data modifications
  - Implement immutable audit log

**2. Error Handling**

- **Issue**: Detailed error messages exposed to clients
- **Risk**: Information disclosure
- **Mitigation**:
  - Return generic error messages to clients
  - Log detailed errors server-side
  - Implement error code mapping

**3. Dependency Vulnerabilities**

- **Issue**: Some dependencies have known vulnerabilities
- **Risk**: Exploitation of known CVEs
- **Mitigation**:
  - Run `npm audit` in CI/CD
  - Update dependencies regularly
  - Use Dependabot for automated updates
  - Monitor security advisories

### Low Priority Findings

**1. Documentation**

- **Issue**: Security documentation incomplete
- **Risk**: Inconsistent security practices
- **Mitigation**: This document addresses this finding

**2. Security Testing**

- **Issue**: Limited security-focused tests
- **Risk**: Regression in security controls
- **Mitigation**: Implement security test suite

## Authorization Patterns

### Role-Based Access Control (RBAC)

**Roles**:

- `ADMIN` - Full platform access
- `LANDLORD` - Property management, payment processing
- `AGENT` - Property management on behalf of landlords
- `TENANT` - Rental agreement management, payment

**Permission Model**:

```
User → Role → Permissions
```

**Implementation**:

```typescript
// Guard decorator for role-based access
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.LANDLORD, Role.AGENT)
@Post('properties')
createProperty(@Body() dto: CreatePropertyDto) {
  // Only landlords and agents can create properties
}

// Permission-based access
@UseGuards(AuthGuard, PermissionGuard)
@Permissions('property:create', 'property:edit')
@Post('properties')
createProperty(@Body() dto: CreatePropertyDto) {
  // Fine-grained permission check
}
```

**Database Schema**:

```sql
-- Roles
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- Permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

### Resource-Based Access Control (RBAC)

**Pattern**: Check if user owns or has permission to access resource

```typescript
// Check resource ownership
async getProperty(id: string, userId: string) {
  const property = await this.propertyRepo.findOne(id);

  if (property.landlord_id !== userId && !this.isAdmin(userId)) {
    throw new ForbiddenException('Access denied');
  }

  return property;
}

// Check resource permission
async updateProperty(id: string, userId: string, dto: UpdatePropertyDto) {
  const property = await this.propertyRepo.findOne(id);

  if (!this.hasPermission(userId, 'property:edit', property)) {
    throw new ForbiddenException('Access denied');
  }

  return this.propertyRepo.update(id, dto);
}
```

### Attribute-Based Access Control (ABAC)

**Pattern**: Check attributes of user, resource, and environment

```typescript
// Check user attributes
async createAgreement(userId: string, dto: CreateAgreementDto) {
  const user = await this.userService.findOne(userId);

  // Check if user is verified
  if (!user.email_verified) {
    throw new BadRequestException('Email not verified');
  }

  // Check if user has completed KYC
  if (!user.kyc_verified) {
    throw new BadRequestException('KYC not completed');
  }

  return this.agreementService.create(userId, dto);
}

// Check resource attributes
async approveDispute(disputeId: string, userId: string) {
  const dispute = await this.disputeRepo.findOne(disputeId);

  // Check if dispute is in correct state
  if (dispute.status !== DisputeStatus.VOTING) {
    throw new BadRequestException('Dispute not in voting state');
  }

  // Check if voting period is active
  if (new Date() > dispute.voting_end_date) {
    throw new BadRequestException('Voting period ended');
  }

  return this.disputeService.approve(disputeId, userId);
}
```

### Delegation Pattern

**Pattern**: Allow users to delegate permissions to other users

```typescript
// Grant permission to another user
async grantPermission(
  granterId: string,
  granteeId: string,
  permission: string,
  resourceId: string
) {
  // Check if granter has permission to grant
  if (!this.hasPermission(granterId, `${permission}:grant`, resourceId)) {
    throw new ForbiddenException('Cannot grant permission');
  }

  // Create delegation record
  return this.delegationRepo.create({
    granter_id: granterId,
    grantee_id: granteeId,
    permission,
    resource_id: resourceId,
    created_at: new Date()
  });
}

// Revoke delegated permission
async revokePermission(
  granterId: string,
  delegationId: string
) {
  const delegation = await this.delegationRepo.findOne(delegationId);

  if (delegation.granter_id !== granterId) {
    throw new ForbiddenException('Cannot revoke permission');
  }

  return this.delegationRepo.delete(delegationId);
}
```

## Input Validation Strategies

### Validation Layers

**Layer 1: Type Validation**

```typescript
// DTO with class-validator
export class CreatePropertyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  price: number;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsEnum(PropertyType)
  type: PropertyType;
}
```

**Layer 2: Business Logic Validation**

```typescript
// Validate business rules
async createProperty(userId: string, dto: CreatePropertyDto) {
  // Check if user is landlord
  const user = await this.userService.findOne(userId);
  if (user.role !== Role.LANDLORD) {
    throw new BadRequestException('Only landlords can create properties');
  }

  // Check if user has verified email
  if (!user.email_verified) {
    throw new BadRequestException('Email not verified');
  }

  // Check if price is reasonable
  if (dto.price < 100 || dto.price > 100000) {
    throw new BadRequestException('Price out of acceptable range');
  }

  return this.propertyRepo.create(userId, dto);
}
```

**Layer 3: Database Constraints**

```sql
-- NOT NULL constraints
ALTER TABLE properties ADD CONSTRAINT properties_title_not_null
  CHECK (title IS NOT NULL);

-- UNIQUE constraints
ALTER TABLE properties ADD CONSTRAINT properties_slug_unique
  UNIQUE (slug);

-- FOREIGN KEY constraints
ALTER TABLE properties ADD CONSTRAINT properties_landlord_fk
  FOREIGN KEY (landlord_id) REFERENCES users(id);

-- CHECK constraints
ALTER TABLE properties ADD CONSTRAINT properties_price_positive
  CHECK (price > 0);
```

### Sanitization

**HTML Sanitization**:

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize user input
function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title']
  });
}

// Use in service
async createProperty(userId: string, dto: CreatePropertyDto) {
  dto.description = sanitizeHtml(dto.description);
  return this.propertyRepo.create(userId, dto);
}
```

**SQL Injection Prevention**:

```typescript
// Use parameterized queries (TypeORM)
const properties = await this.propertyRepo
  .createQueryBuilder('p')
  .where('p.title LIKE :title', { title: `%${searchTerm}%` })
  .getMany();

// Never use string concatenation
// ❌ WRONG: `WHERE title LIKE '%${searchTerm}%'`
// ✅ RIGHT: `WHERE title LIKE :title` with parameters
```

**XSS Prevention**:

```typescript
// Escape output in templates
// Angular: {{ property.description }}  (auto-escaped)
// React: <div>{property.description}</div>  (auto-escaped)

// For HTML content, use sanitization
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

getSafeHtml(html: string) {
  return this.sanitizer.sanitize(SecurityContext.HTML, html);
}
```

### Validation Best Practices

**1. Whitelist Approach**:

```typescript
// ✅ GOOD: Define what's allowed
const ALLOWED_ROLES = [Role.TENANT, Role.LANDLORD, Role.AGENT];

if (!ALLOWED_ROLES.includes(dto.role)) {
  throw new BadRequestException('Invalid role');
}

// ❌ BAD: Define what's not allowed
if (dto.role !== Role.ADMIN) {
  // Allows any other role
}
```

**2. Fail Secure**:

```typescript
// ✅ GOOD: Deny by default
async checkPermission(userId: string, action: string): boolean {
  const permission = await this.permissionRepo.findOne({
    user_id: userId,
    action
  });
  return !!permission;  // Returns false if not found
}

// ❌ BAD: Allow by default
async checkPermission(userId: string, action: string): boolean {
  try {
    const permission = await this.permissionRepo.findOne({
      user_id: userId,
      action
    });
    return true;  // Returns true even if not found
  } catch {
    return true;  // Returns true on error
  }
}
```

**3. Consistent Validation**:

```typescript
// Create validation pipe
@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { type, metatype } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return value;
  }
}

// Use globally
app.useGlobalPipes(new ValidationPipe());
```

## Reentrancy Protection

### Smart Contract Reentrancy

**Pattern**: Checks-Effects-Interactions (CEI)

```rust
// ❌ VULNERABLE: Interaction before state update
pub fn withdraw(env: Env, amount: i128) -> Result<(), Error> {
    let user = env.storage().persistent().get::<_, User>(&caller)?;

    // Interaction (vulnerable to reentrancy)
    transfer_funds(&env, &caller, amount)?;

    // Effects (state update after interaction)
    user.balance -= amount;
    env.storage().persistent().set(&caller, &user);

    Ok(())
}

// ✅ SAFE: State update before interaction (CEI pattern)
pub fn withdraw(env: Env, amount: i128) -> Result<(), Error> {
    let mut user = env.storage().persistent().get::<_, User>(&caller)?;

    // Checks
    if user.balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // Effects (state update first)
    user.balance -= amount;
    env.storage().persistent().set(&caller, &user);

    // Interactions (after state update)
    transfer_funds(&env, &caller, amount)?;

    Ok(())
}
```

### Application-Level Reentrancy

**Pattern**: Mutex/Lock mechanism

```typescript
// Use distributed lock for critical sections
async transferFunds(
  fromUserId: string,
  toUserId: string,
  amount: number
) {
  const lockKey = `transfer:${fromUserId}:${toUserId}`;
  const lock = await this.lockService.acquire(lockKey, 5000);

  try {
    // Critical section
    const fromUser = await this.userRepo.findOne(fromUserId);
    if (fromUser.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    fromUser.balance -= amount;
    await this.userRepo.update(fromUserId, fromUser);

    const toUser = await this.userRepo.findOne(toUserId);
    toUser.balance += amount;
    await this.userRepo.update(toUserId, toUser);
  } finally {
    await lock.release();
  }
}
```

## Overflow Protection

### Integer Overflow

**Pattern**: Use safe arithmetic

```rust
// ❌ VULNERABLE: Unchecked arithmetic
pub fn add_balance(env: Env, amount: i128) -> Result<(), Error> {
    let mut user = env.storage().persistent().get::<_, User>(&caller)?;
    user.balance = user.balance + amount;  // Can overflow
    env.storage().persistent().set(&caller, &user);
    Ok(())
}

// ✅ SAFE: Checked arithmetic
pub fn add_balance(env: Env, amount: i128) -> Result<(), Error> {
    let mut user = env.storage().persistent().get::<_, User>(&caller)?;

    // Use checked_add
    user.balance = user.balance
        .checked_add(amount)
        .ok_or(Error::BalanceOverflow)?;

    env.storage().persistent().set(&caller, &user);
    Ok(())
}
```

### Decimal Precision

**Pattern**: Use fixed-point arithmetic

```typescript
// ❌ VULNERABLE: Floating-point arithmetic
const total = 0.1 + 0.2;  // 0.30000000000000004

// ✅ SAFE: Use Decimal library
import Decimal from 'decimal.js';

const total = new Decimal('0.1').plus(new Decimal('0.2'));
console.log(total.toString());  // '0.3'

// Use in financial calculations
async calculatePayment(amount: string, rate: string): Promise<string> {
  const principal = new Decimal(amount);
  const interestRate = new Decimal(rate);
  const interest = principal.times(interestRate);
  return principal.plus(interest).toString();
}
```

## Emergency Procedures

### Pause Mechanism

**Purpose**: Quickly halt operations in case of security incident

**Implementation**:

```typescript
// Pause decorator
export function RequireNotPaused() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const isPaused = await this.configService.get('SYSTEM_PAUSED');
      if (isPaused) {
        throw new ServiceUnavailableException('System is paused');
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Use in controllers
@Post('payments')
@RequireNotPaused()
async createPayment(@Body() dto: CreatePaymentDto) {
  return this.paymentService.create(dto);
}

// Admin endpoint to pause system
@Post('admin/pause')
@Roles(Role.ADMIN)
async pauseSystem() {
  await this.configService.set('SYSTEM_PAUSED', true);
  await this.notificationService.notifyAdmins('System paused');
  return { status: 'paused' };
}

// Admin endpoint to resume system
@Post('admin/resume')
@Roles(Role.ADMIN)
async resumeSystem() {
  await this.configService.set('SYSTEM_PAUSED', false);
  await this.notificationService.notifyAdmins('System resumed');
  return { status: 'resumed' };
}
```

### Incident Response

**Steps**:

1. **Detect**: Monitor alerts and logs
2. **Assess**: Determine scope and severity
3. **Contain**: Pause affected systems
4. **Investigate**: Analyze logs and audit trail
5. **Remediate**: Fix vulnerability
6. **Recover**: Resume operations
7. **Review**: Post-mortem and improvements

**Incident Response Checklist**:

- [ ] Pause affected systems
- [ ] Notify security team
- [ ] Collect evidence (logs, database snapshots)
- [ ] Analyze root cause
- [ ] Implement fix
- [ ] Test fix in staging
- [ ] Deploy fix to production
- [ ] Monitor for recurrence
- [ ] Document incident
- [ ] Schedule post-mortem

### Rollback Procedure

**Database Rollback**:

```bash
# Backup current database
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%s).sql

# Restore from backup
psql -h $DB_HOST -U $DB_USER $DB_NAME < backup_timestamp.sql

# Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM properties;
```

**Application Rollback**:

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Monitor deployment
# Verify service health
curl http://localhost:3000/health
```

## Security Testing Procedures

### Security Test Suite

**Unit Tests**:

```typescript
describe('Authorization', () => {
  it('should deny access to unauthorized users', async () => {
    const userId = 'user-123';
    const propertyId = 'property-456';

    expect(() =>
      propertyService.getProperty(propertyId, userId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow access to property owner', async () => {
    const userId = 'user-123';
    const propertyId = 'property-456';

    const property = await propertyService.getProperty(propertyId, userId);
    expect(property.landlord_id).toBe(userId);
  });
});

describe('Input Validation', () => {
  it('should reject invalid email', async () => {
    const dto = { email: 'invalid-email' };

    expect(() => userService.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('should reject negative price', async () => {
    const dto = { price: -100 };

    expect(() => propertyService.create(dto)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Integration Tests**:

```typescript
describe('Payment Security', () => {
  it('should prevent double-spending', async () => {
    const userId = 'user-123';
    const amount = 100;

    // First payment
    const payment1 = await paymentService.create(userId, amount);
    expect(payment1.status).toBe('completed');

    // Second payment with same idempotency key
    const payment2 = await paymentService.create(userId, amount);
    expect(payment2.id).toBe(payment1.id); // Same payment
  });

  it('should prevent unauthorized payment modification', async () => {
    const paymentId = 'payment-123';
    const userId = 'user-456'; // Different user

    expect(() =>
      paymentService.update(paymentId, { status: 'cancelled' }, userId),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

**Penetration Testing**:

```bash
# SQL Injection test
curl -X GET "http://localhost:3000/properties?search='; DROP TABLE users; --"

# XSS test
curl -X POST "http://localhost:3000/properties" \
  -H "Content-Type: application/json" \
  -d '{"title": "<script>alert(1)</script>"}'

# CSRF test
# Attempt to modify resource without CSRF token

# Rate limiting test
for i in {1..1000}; do
  curl -X GET "http://localhost:3000/properties"
done
```

## Security Checklist

### Development Checklist

- [ ] Input validation implemented
- [ ] Output encoding implemented
- [ ] Authentication implemented
- [ ] Authorization implemented
- [ ] Audit logging implemented
- [ ] Error handling implemented
- [ ] Security tests written
- [ ] Dependencies scanned for vulnerabilities
- [ ] Secrets not committed
- [ ] HTTPS enforced

### Deployment Checklist

- [ ] Secrets configured in production
- [ ] Database backups configured
- [ ] Monitoring and alerting configured
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] Security headers configured
- [ ] SSL/TLS certificates valid
- [ ] Firewall rules configured
- [ ] Access logs enabled
- [ ] Security team notified

### Operational Checklist

- [ ] Security patches applied
- [ ] Dependencies updated
- [ ] Audit logs reviewed
- [ ] Security events investigated
- [ ] Incident response plan tested
- [ ] Disaster recovery plan tested
- [ ] Security training completed
- [ ] Compliance requirements met
- [ ] Third-party security assessments completed
- [ ] Security documentation updated

## Related Documentation

- [Authorization Documentation](./AUTHORIZATION.md)
- [Input Validation](./INPUT-VALIDATION.md)
- [Emergency Procedures](./EMERGENCY-PROCEDURES.md)
- [Secrets Management](./SECRETS_MANAGEMENT.md)
- [Audit Logging](./AUDIT_LOGGING.md)

## Support & Escalation

**For Security Issues**:

1. Do not commit or push sensitive information
2. Contact security team immediately
3. Document the issue
4. Follow incident response procedure
5. Escalate to platform lead if critical

**Security Team Contact**: security@chioma.io
**Emergency Hotline**: [contact info]
