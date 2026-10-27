# ADR-0004: Dual Authentication: JWT + Stellar SEP-0010

## Status

Accepted

## Context

Chioma targets two distinct user segments:

1. **Traditional web users** — Expect email/password authentication
2. **Blockchain-native users** — Prefer wallet-based authentication without passwords

Both segments need to:
- Access the same REST API
- Perform the same operations (create agreements, make payments, etc.)
- Have consistent authorization and session management
- Experience secure authentication flows

**Requirements:**
- Support email/password authentication for traditional users
- Support Stellar wallet authentication for blockchain users
- Unified authorization mechanism (same roles and permissions)
- Secure token management with short lifetimes
- Prevent token theft and replay attacks
- Allow users to link multiple authentication methods to one account

**Constraints:**
- Cannot require all users to have a Stellar wallet
- Cannot require blockchain users to create passwords
- Must maintain security standards for both methods
- JWT infrastructure already in place for traditional auth

## Decision

Implement **dual authentication** supporting both JWT (email/password) and Stellar SEP-0010 (wallet-based) authentication methods.

**Architecture:**

```
┌─────────────────────────────────────────────────┐
│          Authentication Endpoints               │
├───────────────────┬─────────────────────────────┤
│   Traditional     │    Stellar SEP-0010         │
│                   │                             │
│ POST /auth/login  │  GET /auth/stellar/         │
│ • Email/password  │  • Challenge request        │
│ • Returns JWT     │  • Transaction signing      │
│                   │  • Returns JWT              │
└───────────────────┴─────────────────────────────┘
                      ↓
            ┌─────────────────┐
            │   JWT Tokens    │
            │  (Unified Auth) │
            └─────────────────┘
                      ↓
            ┌─────────────────┐
            │   JwtAuthGuard  │
            │  (All Routes)   │
            └─────────────────┘
```

**Token Strategy:**
- **Access token**: JWT, 15-minute lifetime, passed in Authorization header
- **Refresh token**: JWT, 7-day lifetime, stored in HttpOnly cookie
- Both methods issue the same token format with identical claims
- Tokens include: `userId`, `email`, `role`, `walletAddress` (if applicable)

**SEP-0010 Flow:**
1. Client requests challenge from `GET /auth/stellar/challenge?address=G...`
2. Server generates random nonce, creates Stellar transaction with ManageData operation
3. Client signs transaction with wallet private key
4. Client submits signed transaction to `POST /auth/stellar/authenticate`
5. Server verifies signature and transaction validity
6. Server issues JWT access and refresh tokens

## Alternatives Considered

### Alternative 1: Email/Password Only

**Pros:**
- Simplest implementation
- Well-understood security model
- No blockchain dependencies for auth

**Cons:**
- Excludes blockchain-native users
- Friction for users who prefer wallet auth
- Password management overhead (resets, security)

**Reason Not Chosen:**
Chioma is a blockchain-native platform. Forcing blockchain users to create passwords adds unnecessary friction and contradicts the platform's Web3 positioning.

### Alternative 2: Stellar SEP-0010 Only

**Pros:**
- Unified authentication method
- No password storage or management
- Fully blockchain-native

**Cons:**
- High barrier for non-crypto users
- Requires wallet setup before using platform
- Excludes users unfamiliar with crypto wallets

**Reason Not Chosen:**
Many landlords and tenants are not crypto-native. Requiring a wallet would severely limit adoption, especially in traditional rental markets.

### Alternative 3: OAuth 2.0 Providers (Google, GitHub, etc.)

**Pros:**
- No password management
- Trusted third-party authentication
- Easy sign-up flow

**Cons:**
- Dependency on third-party services
- No native Stellar integration
- Privacy concerns with data sharing
- Additional OAuth flow complexity

**Reason Not Chosen:**
Doesn't address blockchain wallet authentication. Could be added as a third option in the future, but doesn't solve the core problem of supporting both traditional and blockchain users.

### Alternative 4: Separate Auth Systems per Method

**Pros:**
- Complete separation of concerns
- No mixing of authentication logic

**Cons:**
- Two separate authorization systems to maintain
- Inconsistent user experience
- Cannot link authentication methods to one account
- Code duplication

**Reason Not Chosen:**
Unnecessary complexity. Both methods can issue the same JWT tokens and use the same authorization guards.

## Consequences

### Positive

✅ **Inclusive platform**: Both traditional and blockchain users can authenticate

✅ **Unified authorization**: Single set of guards and permission checks

✅ **User flexibility**: Users can link both methods to one account (future enhancement)

✅ **Security**: Both methods cryptographically secure (bcrypt for passwords, EdDSA for wallet signatures)

✅ **Standard token format**: JWT is industry-standard, works with existing tools

✅ **Fast authentication**: SEP-0010 challenge-response is quick (no external API calls)

### Negative

❌ **Increased complexity**: Two authentication code paths to maintain

❌ **Longer JWT payloads**: Tokens include both email and wallet address (if both present)

❌ **Token revocation challenge**: Short-lived tokens + refresh token rotation mitigate but don't eliminate

❌ **SEP-0010 user experience**: Wallet signing UX can be confusing for non-crypto users

❌ **Attack surface**: Two authentication methods = two potential attack vectors

### Mitigation

**For complexity:**
- Shared `JwtAuthGuard` processes tokens from both methods identically
- Single `JwtStrategy` validates tokens regardless of issuance method
- Common user service methods for both flows
- Comprehensive test coverage for both paths

**For token revocation:**
- Short access token lifetime (15 minutes)
- Refresh token rotation on every refresh
- Immediate revocation on password change or security event
- Optional: Redis-based blocklist for compromised tokens

**For user experience:**
- Clear UI differentiation between authentication methods
- Step-by-step wallet connection guides
- Fallback to email/password if wallet auth fails

**For security:**
- Rate limiting on all auth endpoints (Throttler guard)
- Failed login attempt tracking (account lockout after 5 failures)
- Audit logging for all authentication events
- Two-factor authentication (TOTP) available for both methods

## Related Decisions

- ADR-0002: NestJS Framework — Supports Passport strategies for both auth methods
- ADR-0011: Global ValidationPipe — Validates DTOs for both auth endpoints
- ADR-0012: Event-Driven Audit Logging — Logs all authentication events

## Implementation Notes

**User entity supports both methods:**
```typescript
@Entity('users')
export class User {
  @Column({ nullable: true })
  email: string | null; // Nullable for wallet-only users

  @Column({ nullable: true })
  password: string | null; // Nullable for wallet-only users

  @Column({ nullable: true, unique: true })
  walletAddress: string | null; // Nullable for email-only users

  @Column({
    type: 'enum',
    enum: AuthMethod,
    default: AuthMethod.PASSWORD,
  })
  authMethod: AuthMethod; // 'password' | 'stellar'
}
```

**JWT payload includes auth method:**
```typescript
interface JwtPayload {
  sub: string;          // User ID
  email?: string;       // Email (if present)
  walletAddress?: string; // Wallet (if present)
  role: UserRole;       // User role
  authMethod: AuthMethod; // How they authenticated
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

**Authentication endpoints:**
- `POST /auth/login` — Email/password login
- `POST /auth/register` — Email/password registration
- `GET /auth/stellar/challenge` — Request SEP-0010 challenge
- `POST /auth/stellar/authenticate` — Submit signed transaction
- `POST /auth/refresh` — Refresh access token (works for both methods)
- `POST /auth/logout` — Invalidate refresh token

**Guard usage:**
```typescript
@Controller('properties')
@UseGuards(JwtAuthGuard) // Works for both auth methods
export class PropertiesController {
  @Get()
  async findAll(@CurrentUser() user: User) {
    // user.authMethod tells you how they authenticated
  }
}
```

**Security enhancements:**
- bcrypt cost factor: 10 (for password hashing)
- SEP-0010 challenge expires after 5 minutes
- Stellar transaction sequence must be 0 (prevents replay)
- Transaction source account must match claimed address

**Future enhancements:**
- Link both auth methods to one account
- Social OAuth (Google, GitHub) as third option
- WebAuthn/passkey support
- Multi-factor authentication for both methods

## References

- [Stellar SEP-0010 Specification](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NestJS Passport Documentation](https://docs.nestjs.com/security/authentication)

## Date

2024-01-18

## Author(s)

- Security Team (@chioma-security)
- Backend Team (@chioma-backend)
