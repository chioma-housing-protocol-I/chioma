# Authentication Documentation

Comprehensive documentation of the Chioma authentication system, covering architecture, JWT and Stellar auth flows, MFA, password policies, guards, decorators, rate limiting, metrics, and security considerations.

> For a quick API reference with request/response examples, see [API Authentication Guide](./api/AUTHENTICATION.md).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication Methods](#authentication-methods)
  - [JWT (Email/Password)](#jwt-emailpassword)
  - [Stellar SEP-0010 (Wallet)](#stellar-sep-0010-wallet)
- [Token System](#token-system)
  - [Access Tokens](#access-tokens)
  - [Refresh Tokens](#refresh-tokens)
  - [Token Rotation](#token-rotation)
  - [JWT Payload Structure](#jwt-payload-structure)
- [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
  - [TOTP Setup](#totp-setup)
  - [MFA Login Flow](#mfa-login-flow)
  - [Backup Codes](#backup-codes)
  - [Disabling MFA](#disabling-mfa)
- [Password Security](#password-security)
  - [Password Policy](#password-policy)
  - [Password Hashing](#password-hashing)
  - [Password Reset Flow](#password-reset-flow)
- [Account Protection](#account-protection)
  - [Account Lockout](#account-lockout)
  - [Email Verification](#email-verification)
- [Guards and Decorators](#guards-and-decorators)
  - [JwtAuthGuard](#jwtauthguard)
  - [RolesGuard](#rolesguard)
  - [CurrentUser Decorator](#currentuser-decorator)
  - [Public Decorator](#public-decorator)
  - [Roles Decorator](#roles-decorator)
- [Role-Based Access Control](#role-based-access-control)
- [Rate Limiting](#rate-limiting)
- [Refresh Token Cookie Security](#refresh-token-cookie-security)
- [Auth Metrics and Monitoring](#auth-metrics-and-monitoring)
- [API Endpoints Reference](#api-endpoints-reference)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Client (Frontend)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Email/Pass   │  │ Stellar      │  │ MFA            │ │
│  │ Login Form   │  │ Wallet       │  │ TOTP Code      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘ │
└─────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                   Auth Controller                         │
│                                                          │
│  POST /auth/register    POST /auth/stellar/challenge     │
│  POST /auth/login       POST /auth/stellar/verify        │
│  POST /auth/refresh     POST /auth/login/mfa/complete    │
│  POST /auth/logout      POST /auth/mfa/enable            │
│  POST /auth/forgot-password                              │
│  POST /auth/reset-password                               │
│  GET  /auth/verify-email                                 │
│  GET  /auth/mfa/status                                   │
└──────────────────┬───────────────────────────────────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
   ┌───────────┐ ┌──────┐ ┌──────────────┐
   │AuthService│ │MFA   │ │StellarAuth   │
   │           │ │Service│ │Service       │
   └─────┬─────┘ └──┬───┘ └──────┬───────┘
         │          │             │
         ▼          ▼             ▼
   ┌───────────────────────────────────────┐
   │         PostgreSQL (Users,            │
   │         MfaDevices, AuthMetrics)      │
   └───────────────────────────────────────┘
```

**Key components:**

| Component               | Location                                              | Responsibility                                       |
| ----------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `AuthController`        | `modules/auth/auth.controller.ts`                     | HTTP endpoints for email/password auth               |
| `StellarAuthController` | `modules/auth/controllers/stellar-auth.controller.ts` | HTTP endpoints for wallet auth                       |
| `AuthService`           | `modules/auth/auth.service.ts`                        | Core auth logic, token generation, password handling |
| `StellarAuthService`    | `modules/auth/services/stellar-auth.service.ts`       | SEP-0010 challenge/verify flow                       |
| `MfaService`            | `modules/auth/services/mfa.service.ts`                | TOTP setup, verification, backup codes               |
| `PasswordPolicyService` | `modules/auth/services/password-policy.service.ts`    | Password validation and strength scoring             |
| `AuthMetricsService`    | `modules/auth/services/auth-metrics.service.ts`       | Auth attempt tracking and analytics                  |
| `JwtStrategy`           | `modules/auth/strategies/jwt.strategy.ts`             | Passport JWT validation strategy                     |

---

## Authentication Methods

### JWT (Email/Password)

Standard email/password authentication with bcrypt password hashing.

**Registration flow:**

```
Client                        Server
  │                              │
  │  POST /auth/register         │
  │  { email, password,          │
  │    firstName, lastName,      │
  │    role }                    │
  │─────────────────────────────▶│
  │                              │── Validate password policy
  │                              │── Check email uniqueness (with distributed lock)
  │                              │── Hash password (bcrypt, 12 rounds)
  │                              │── Create user record
  │                              │── Generate verification token
  │                              │── Send verification email (async)
  │                              │── Generate JWT access + refresh tokens
  │                              │── Store hashed refresh token
  │                              │── Set refresh token cookie
  │  { user, accessToken }       │
  │◀─────────────────────────────│
```

**Login flow:**

```
Client                        Server
  │                              │
  │  POST /auth/login            │
  │  { email, password }         │
  │─────────────────────────────▶│
  │                              │── Find user by email (or emailHash)
  │                              │── Check account active & not locked
  │                              │── Verify password with bcrypt
  │                              │── Reset failed login counter
  │                              │── Check if MFA is enabled
  │                              │
  │                              │── [No MFA]: Generate tokens, return
  │                              │── [MFA enabled]: Return mfaToken (5min TTL)
  │                              │
  │  { user, accessToken }       │
  │  OR { mfaRequired, mfaToken }│
  │◀─────────────────────────────│
```

**Key security features:**

- Registration is protected by a distributed lock on the email address to prevent race conditions
- Email lookup uses both plaintext and SHA-256 hash (`emailHash`) for encrypted-at-rest scenarios
- Failed login response is identical for "user not found" and "wrong password" to prevent user enumeration

### Stellar SEP-0010 (Wallet)

Passwordless authentication using Stellar wallet signatures, implementing the [SEP-0010](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md) standard.

**Challenge-response flow:**

```
Client                        Server
  │                              │
  │  POST /auth/stellar/challenge│
  │  { walletAddress }           │
  │─────────────────────────────▶│
  │                              │── Validate Stellar address format (G + 55 base32 chars)
  │                              │── Check no active challenge exists
  │                              │── Generate 32-byte random nonce
  │                              │── Build Stellar transaction:
  │                              │   - manageData op with nonce
  │                              │   - 5-minute timeout
  │                              │   - Signed by server keypair
  │                              │── Store challenge (in-memory Map)
  │  { challenge (XDR),          │
  │    expiresAt }               │
  │◀─────────────────────────────│
  │                              │
  │  [Client signs with wallet]  │
  │                              │
  │  POST /auth/stellar/verify   │
  │  { walletAddress, signature, │
  │    challenge }               │
  │─────────────────────────────▶│
  │                              │── Look up stored challenge by hash
  │                              │── Verify not expired
  │                              │── Verify wallet address matches
  │                              │── Verify signature on transaction
  │                              │── Delete challenge (single-use)
  │                              │── Find or create user by walletAddress
  │                              │── Generate JWT tokens
  │  { user, accessToken,        │
  │    refreshToken }            │
  │◀─────────────────────────────│
```

**Notes:**

- Challenges expire after 5 minutes
- Only one active challenge per wallet address at a time
- Expired challenges are cleaned up on each new challenge request
- New users created via Stellar auth are marked `emailVerified: true` (wallet ownership is the verification)
- Network is configurable: `STELLAR_NETWORK=testnet|mainnet`

---

## Token System

### Access Tokens

| Property | Value                                  |
| -------- | -------------------------------------- |
| Type     | JWT (HS256)                            |
| Lifetime | 15 minutes                             |
| Secret   | `JWT_SECRET` env var                   |
| Sent via | Response body (`accessToken` field)    |
| Used via | `Authorization: Bearer <token>` header |

**Payload fields:** `sub` (user ID), `email`, `role`, `type: "access"`

### Refresh Tokens

| Property | Value                                      |
| -------- | ------------------------------------------ |
| Type     | JWT (HS256)                                |
| Lifetime | 7 days                                     |
| Secret   | `JWT_REFRESH_SECRET` env var               |
| Sent via | `Set-Cookie: refreshToken=...` (HttpOnly)  |
| Stored   | bcrypt hash in `users.refreshToken` column |

### Token Rotation

Refresh tokens use **rotation**: every time a refresh token is used, a new refresh token is issued and the old one is invalidated. This limits the window of exposure if a refresh token is stolen.

```
Client                        Server
  │                              │
  │  POST /auth/refresh          │
  │  Cookie: refreshToken=old    │
  │─────────────────────────────▶│
  │                              │── Verify JWT signature (JWT_REFRESH_SECRET)
  │                              │── Check type === "refresh"
  │                              │── Load user, verify refreshToken exists
  │                              │── bcrypt.compare(old, stored hash)
  │                              │── Generate NEW access + refresh tokens
  │                              │── Store NEW refresh token hash
  │  { accessToken }             │
  │  Set-Cookie: refreshToken=new│
  │◀─────────────────────────────│
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string; // User ID (UUID)
  email: string; // User email or wallet address
  role: string; // User role (tenant, landlord, agent, admin)
  type: 'access' | 'refresh' | 'mfa_required';
  iat: number; // Issued at (auto)
  exp: number; // Expiration (auto)
}
```

### Token Type Validation

Every place that decodes a JWT (`JwtStrategy`, `RefreshTokenStrategy`, `AuthService.refreshToken()`) must confirm the `type` claim matches what that flow expects, so an access token can't be replayed as a refresh token or vice versa. This check is centralized in `ValidationUtils.validateTokenType(payload, expectedType)` (`src/common/utils/validation.utils.ts`), which returns `true`/`false`; each call site still throws its own context-appropriate error (`UnauthorizedException`, passport `Error`, or `AuthenticationError`) when the check fails.

The `JwtStrategy` validates that `type === "access"` and that the user exists and is active before attaching the user to the request.

---

## Multi-Factor Authentication (MFA)

Chioma supports TOTP-based MFA using authenticator apps (Google Authenticator, Authy, etc.).

### TOTP Setup

```
Client                        Server
  │                              │
  │  POST /auth/mfa/enable       │
  │  Authorization: Bearer <tok> │
  │  { deviceName? }             │
  │─────────────────────────────▶│
  │                              │── Check no existing active MFA device
  │                              │── Generate TOTP secret (speakeasy, 32 bytes)
  │                              │── Encrypt secret with AES-256-CBC
  │                              │── Generate 10 backup codes (8-char hex each)
  │                              │── Hash backup codes with bcrypt
  │                              │── Store MfaDevice record
  │                              │── Generate QR code data URL
  │  { secret, qrCodeUrl,        │
  │    backupCodes }             │
  │◀─────────────────────────────│
```

**MFA secret encryption:** The TOTP secret is encrypted at rest using AES-256-CBC with a key derived from `SECURITY_ENCRYPTION_KEY`. The IV is prepended to the ciphertext as `iv:encrypted`.

### MFA Login Flow

When MFA is enabled, login becomes a two-step process:

```
Client                        Server
  │                              │
  │  POST /auth/login            │
  │  { email, password }         │
  │─────────────────────────────▶│
  │                              │── Validate credentials (normal flow)
  │                              │── Detect active MFA device
  │  { mfaRequired: true,        │── Generate temporary mfaToken (5min TTL)
  │    mfaToken, user }          │
  │◀─────────────────────────────│
  │                              │
  │  POST /auth/login/mfa/complete│
  │  { mfaToken, mfaCode }      │
  │─────────────────────────────▶│
  │                              │── Verify mfaToken (type === "mfa_required")
  │                              │── Try TOTP verification (2-step window)
  │                              │── Try backup code verification (fallback)
  │                              │── Generate final access + refresh tokens
  │  { user, accessToken }       │
  │◀─────────────────────────────│
```

**TOTP verification window:** Allows 2 time steps (60 seconds) of tolerance to account for clock drift between server and authenticator app.

### Backup Codes

- **Generated:** 10 codes per MFA setup, each 8 hex characters (e.g., `A1B2C3D4`)
- **Storage:** Each code is individually bcrypt-hashed
- **Single use:** Used codes are permanently removed from the stored array
- **Regeneration:** `POST /auth/mfa/backup-codes` generates a fresh set of 10 codes (requires authentication)

### Disabling MFA

```
POST /auth/mfa/disable
Authorization: Bearer <token>
{ "token": "<TOTP code or backup code>" }
```

Requires a valid TOTP code or backup code to confirm identity before disabling. All active MFA devices are set to `DISABLED` status.

---

## Password Security

### Password Policy

**Location:** `modules/auth/services/password-policy.service.ts`

All passwords are validated against a comprehensive policy:

| Rule              | Requirement                           |
| ----------------- | ------------------------------------- |
| Minimum length    | 8 characters                          |
| Maximum length    | 128 characters                        |
| Uppercase         | At least one uppercase letter (A-Z)   |
| Lowercase         | At least one lowercase letter (a-z)   |
| Number            | At least one digit (0-9)              |
| Special character | At least one special character        |
| Common passwords  | Rejected against a built-in blocklist |
| Strength score    | Minimum score of 3/5                  |

**Strength scoring (0-5):**

| Criterion                   | Points |
| --------------------------- | ------ |
| Length >= 8                 | +1     |
| Length >= 12                | +1     |
| Length >= 16                | +1     |
| 3+ character types          | +1     |
| All 4 character types       | +1     |
| Contains repeated chars     | -1     |
| Contains sequential nums    | -1     |
| Contains sequential letters | -1     |
| Contains keyboard patterns  | -1     |

Minimum required strength is 3 out of 5.

### Password Hashing

- **Algorithm:** bcrypt via `bcryptjs`
- **Salt rounds:** 12
- **Applied to:** User passwords, refresh tokens, MFA backup codes

### Password Reset Flow

```
Client                        Server
  │                              │
  │  POST /auth/forgot-password  │
  │  { email }                   │
  │─────────────────────────────▶│
  │                              │── Find user by email
  │                              │── Generate 32-byte random token
  │                              │── Store SHA-256 hash of token
  │                              │── Set expiry (1 hour)
  │                              │── Send reset email (async)
  │  { message }                 │── ALWAYS return success (prevent enumeration)
  │◀─────────────────────────────│
  │                              │
  │  POST /auth/reset-password   │
  │  { token, newPassword }      │
  │─────────────────────────────▶│
  │                              │── Hash token with SHA-256, look up user
  │                              │── Verify token not expired (1 hour)
  │                              │── Validate new password against policy
  │                              │── Hash new password (bcrypt)
  │                              │── Clear reset token + unlock account
  │  { message }                 │
  │◀─────────────────────────────│
```

**Security notes:**

- Reset token is stored as a SHA-256 hash (not plaintext) so database exposure doesn't reveal active tokens
- The forgot-password endpoint always returns the same response regardless of whether the email exists
- Password reset also clears any account lockout

---

## Account Protection

### Account Lockout

| Parameter               | Value      |
| ----------------------- | ---------- |
| Max failed attempts     | 5          |
| Lockout duration        | 30 minutes |
| Reset on success        | Yes        |
| Reset on password reset | Yes        |

After 5 consecutive failed login attempts, the account is locked for 30 minutes. The lockout is transparent to the attacker - the same "Invalid email or password" message is returned for locked accounts.

### Email Verification

- On registration, a 32-byte random verification token is generated
- A verification email is sent asynchronously (fire-and-forget)
- `GET /auth/verify-email?token=<token>` marks the email as verified
- Wallet-based (Stellar) auth users are auto-verified

---

## Guards and Decorators

### JwtAuthGuard

**Location:** `modules/auth/guards/jwt-auth.guard.ts`

Extends Passport's `AuthGuard('jwt')`. Applied to protected routes to require a valid access token.

**Behavior:**

- Checks for `@Public()` decorator; if present, skips authentication
- Otherwise, extracts JWT from `Authorization: Bearer <token>` header
- Delegates to `JwtStrategy` for validation
- Attaches the validated user object to `request.user`

**Usage:**

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

### RolesGuard

**Location:** `modules/auth/guards/roles.guard.ts`

Checks that the authenticated user has one of the required roles.

**Usage:**

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LANDLORD)
@Get('admin/dashboard')
async getAdminDashboard() { ... }
```

Throws `403 Forbidden` with "Insufficient permissions" if the user's role doesn't match.

### CurrentUser Decorator

**Location:** `modules/auth/decorators/current-user.decorator.ts`

Parameter decorator that extracts the authenticated user from `request.user`.

```typescript
@Get('me')
async getMe(@CurrentUser() user: User) {
  return user;
}
```

Throws `401 Unauthorized` if no user is found on the request (guard was not applied or authentication failed).

### Public Decorator

**Location:** `modules/auth/decorators/public.decorator.ts`

Marks a route as publicly accessible, bypassing `JwtAuthGuard`.

```typescript
@Public()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

### Roles Decorator

**Location:** `modules/auth/decorators/roles.decorator.ts`

Sets metadata for `RolesGuard` to check against.

```typescript
@Roles(UserRole.ADMIN)  // Only admins
@Roles(UserRole.LANDLORD, UserRole.AGENT)  // Landlords or agents
```

---

## Role-Based Access Control

| Role       | Enum Value | Description                              |
| ---------- | ---------- | ---------------------------------------- |
| `tenant`   | `TENANT`   | Renters who search and manage tenancies  |
| `landlord` | `LANDLORD` | Property owners who manage listings      |
| `agent`    | `AGENT`    | Real estate agents managing properties   |
| `admin`    | `ADMIN`    | Platform administrators with full access |

**Applying RBAC to endpoints:**

```typescript
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  @Post()
  @Roles(UserRole.LANDLORD, UserRole.AGENT)
  async createProperty() { ... }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteProperty() { ... }

  @Get()
  // No @Roles — any authenticated user can list properties
  async listProperties() { ... }
}
```

---

## Rate Limiting

Auth endpoints have strict per-endpoint rate limits to prevent brute-force attacks:

| Endpoint                        | Limit       | Window |
| ------------------------------- | ----------- | ------ |
| `POST /auth/register`           | 3 requests  | 60 sec |
| `POST /auth/login`              | 5 requests  | 60 sec |
| `POST /auth/login/mfa/complete` | 10 requests | 60 sec |
| `POST /auth/refresh`            | 10 requests | 60 sec |
| `POST /auth/forgot-password`    | 3 requests  | 60 sec |
| `POST /auth/reset-password`     | 3 requests  | 60 sec |
| `GET /auth/verify-email`        | 5 requests  | 60 sec |
| `POST /auth/mfa/enable`         | 5 requests  | 60 sec |
| `POST /auth/mfa/verify`         | 10 requests | 60 sec |
| `POST /auth/mfa/disable`        | 5 requests  | 60 sec |
| `POST /auth/mfa/backup-codes`   | 5 requests  | 60 sec |
| `POST /auth/stellar/challenge`  | 5 requests  | 60 sec |
| `POST /auth/stellar/verify`     | 10 requests | 60 sec |

The auth controller also applies a global `AUTH` rate limit category via `@RateLimitCategory(EndpointCategory.AUTH)`.

---

## Refresh Token Cookie Security

Refresh tokens are delivered via secure HTTP-only cookies rather than the response body:

```typescript
res.cookie('refreshToken', refreshToken, {
  httpOnly: true, // Not accessible via JavaScript (prevents XSS theft)
  secure: true, // HTTPS only (in production)
  sameSite: 'strict', // Not sent with cross-origin requests (prevents CSRF)
  maxAge: 604800000, // 7 days in milliseconds
  path: '/api/auth', // Only sent to auth endpoints
});
```

| Attribute  | Value          | Purpose                            |
| ---------- | -------------- | ---------------------------------- |
| `httpOnly` | `true`         | Prevents XSS token theft           |
| `secure`   | `true` in prod | Ensures HTTPS-only transport       |
| `sameSite` | `strict`       | Prevents CSRF attacks              |
| `path`     | `/api/auth`    | Limits cookie scope to auth routes |
| `maxAge`   | 7 days         | Matches refresh token TTL          |

The `/auth/refresh` endpoint reads the refresh token from the cookie first, falling back to the request body for non-browser clients.

---

## Auth Metrics and Monitoring

**Location:** `modules/auth/services/auth-metrics.service.ts`

Every authentication attempt (register, login, Stellar auth) is recorded with:

- Auth method (PASSWORD or STELLAR)
- Success/failure status
- Duration in milliseconds
- IP address and user agent
- Error message (on failure)

### Metrics Endpoints

**Location:** `modules/auth/controllers/auth-metrics.controller.ts`

| Endpoint                        | Description                                   |
| ------------------------------- | --------------------------------------------- |
| `GET /auth/metrics/stats`       | Success rates, method breakdown, daily trends |
| `GET /auth/metrics/performance` | P50/P95/P99 latency by auth method            |
| `GET /auth/metrics/hourly`      | Hourly usage patterns by method               |

### Stats Response Structure

```typescript
interface AuthStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number; // Percentage
  averageDuration: number; // Milliseconds
  methodBreakdown: {
    PASSWORD: { attempts; successes; failures; successRate; averageDuration };
    STELLAR: { attempts; successes; failures; successRate; averageDuration };
  };
  dailyTrend: Array<{ date; attempts; successes; failures }>;
  errorBreakdown: Array<{ error; count; percentage }>;
}
```

### Metrics Cleanup

Old metrics are automatically cleaned up after 90 days via `AuthMetricsCleanupService`.

---

## API Endpoints Reference

| Method | Endpoint                       | Auth Required | Description                       |
| ------ | ------------------------------ | ------------- | --------------------------------- |
| POST   | `/api/auth/register`           | No            | Create new user account           |
| POST   | `/api/auth/login`              | No            | Login with email/password         |
| POST   | `/api/auth/login/mfa/complete` | No            | Complete MFA login                |
| POST   | `/api/auth/refresh`            | No            | Refresh access token              |
| POST   | `/api/auth/logout`             | Yes (JWT)     | Invalidate refresh token          |
| POST   | `/api/auth/forgot-password`    | No            | Request password reset email      |
| POST   | `/api/auth/reset-password`     | No            | Reset password with token         |
| GET    | `/api/auth/verify-email`       | No            | Verify email address              |
| POST   | `/api/auth/mfa/enable`         | Yes (JWT)     | Generate TOTP secret + QR code    |
| POST   | `/api/auth/mfa/verify`         | Yes (JWT)     | Verify TOTP token or backup code  |
| POST   | `/api/auth/mfa/disable`        | Yes (JWT)     | Disable MFA (requires valid code) |
| POST   | `/api/auth/mfa/backup-codes`   | Yes (JWT)     | Regenerate backup codes           |
| GET    | `/api/auth/mfa/status`         | Yes (JWT)     | Check if MFA is enabled           |
| POST   | `/api/auth/stellar/challenge`  | No            | Generate Stellar auth challenge   |
| POST   | `/api/auth/stellar/verify`     | No            | Verify wallet signature           |

---

## Environment Variables

| Variable                    | Required    | Description                                   | Default       |
| --------------------------- | ----------- | --------------------------------------------- | ------------- |
| `JWT_SECRET`                | Yes         | Secret key for signing access tokens          | _(none)_      |
| `JWT_REFRESH_SECRET`        | Yes         | Secret key for signing refresh tokens         | _(none)_      |
| `SECURITY_ENCRYPTION_KEY`   | Yes         | Encryption key for MFA secrets (AES-256)      | _(none)_      |
| `STELLAR_SERVER_SECRET_KEY` | For Stellar | Server keypair for SEP-0010 challenge signing | _(none)_      |
| `STELLAR_NETWORK`           | No          | Stellar network (`testnet` or `mainnet`)      | `testnet`     |
| `NODE_ENV`                  | No          | Controls cookie `secure` flag                 | `development` |

---

## Security Considerations

### Token Storage

- **Access tokens** are short-lived (15min) and stored in memory on the frontend
- **Refresh tokens** are stored in HttpOnly cookies, never exposed to JavaScript
- **Refresh tokens** are stored as bcrypt hashes in the database — database exposure doesn't reveal valid tokens

### Credential Security

- Passwords are hashed with bcrypt (12 salt rounds) — never stored in plaintext
- MFA secrets are encrypted with AES-256-CBC at rest
- Reset tokens are stored as SHA-256 hashes
- Backup codes are individually bcrypt-hashed

### Enumeration Prevention

- Login returns identical error messages for "user not found" and "wrong password"
- Forgot-password always returns success regardless of email existence
- Locked accounts return the same error as invalid credentials

### Brute Force Protection

- Per-endpoint rate limiting on all auth endpoints
- Account lockout after 5 failed attempts (30-minute cooldown)
- Auth category rate limiting applied globally to auth routes

### Session Management

- Token rotation on every refresh (old refresh token is invalidated)
- Logout invalidates the refresh token server-side
- MFA tokens are short-lived (5 minutes)

### CSRF Protection

- Refresh token cookie uses `sameSite: 'strict'`
- Cookie is scoped to `/api/auth` path only
- Global CSRF token validation is active (see Security docs)
