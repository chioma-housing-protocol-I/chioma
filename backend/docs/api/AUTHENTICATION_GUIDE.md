# API Authentication Guide

Quick reference guide for integrating with the Chioma authentication API. For comprehensive documentation covering architecture, security, and internal implementation details, see the main [Authentication Documentation](../AUTHENTICATION.md).

---

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication Methods](#authentication-methods)
  - [Email/Password Authentication](#emailpassword-authentication)
  - [Stellar Wallet Authentication](#stellar-wallet-authentication)
- [Using Access Tokens](#using-access-tokens)
- [Token Refresh](#token-refresh)
- [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)
- [Password Management](#password-management)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Best Practices](#best-practices)

---

## Getting Started

**Base URL:** `https://api.chioma.com` (or `http://localhost:5000` in development)

**Authentication Endpoints:** `/api/auth/*`

All API requests requiring authentication must include an access token in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

---

## Authentication Methods

### Email/Password Authentication

#### 1. Register a New Account

**Endpoint:** `POST /api/auth/register`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant"
}
```

**Password Requirements:**
- Minimum 8 characters, maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character
- Not in the common passwords blocklist
- Minimum strength score of 3/5

**Valid Roles:** `tenant`, `landlord`, `agent`, `admin`

**Response (201 Created):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant",
    "emailVerified": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** A verification email is sent to the provided address. The refresh token is automatically set as an HTTP-only cookie.

---

#### 2. Login

**Endpoint:** `POST /api/auth/login`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!"
}
```

**Response (200 OK) - No MFA:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK) - MFA Enabled:**

```json
{
  "mfaRequired": true,
  "mfaToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

If MFA is enabled, proceed to [Complete MFA Login](#3-complete-mfa-login).

---

#### 3. Complete MFA Login

**Endpoint:** `POST /api/auth/login/mfa/complete`

**Request:**

```json
{
  "mfaToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mfaCode": "123456"
}
```

**Note:** `mfaCode` can be either a 6-digit TOTP code from your authenticator app or an 8-character backup code.

**Response (200 OK):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Stellar Wallet Authentication

Passwordless authentication using Stellar wallet signatures (SEP-0010 standard).

#### 1. Request Challenge

**Endpoint:** `POST /api/auth/stellar/challenge`

**Request:**

```json
{
  "walletAddress": "GAKFQWEXAMPLE..."
}
```

**Response (201 Created):**

```json
{
  "challenge": "AAAAAgAAAACN...",
  "expiresAt": "2024-01-15T10:35:00.000Z"
}
```

**Note:** The challenge is a Stellar transaction XDR that must be signed by the wallet within 5 minutes.

---

#### 2. Verify Signature

Sign the challenge transaction with your wallet and submit it for verification.

**Endpoint:** `POST /api/auth/stellar/verify`

**Request:**

```json
{
  "walletAddress": "GAKFQWEXAMPLE...",
  "challenge": "AAAAAgAAAACN...",
  "signature": "AAAAAQAAAAC..."
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "GAKFQWEXAMPLE...",
    "emailVerified": true,
    "role": "tenant"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** If this is the first time authenticating with this wallet, a new user account is automatically created.

---

## Using Access Tokens

Once you have an access token, include it in the `Authorization` header for all authenticated requests:

**Example Request:**

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://api.chioma.com/api/properties
```

**Token Lifetime:** Access tokens expire after **15 minutes**. Use the refresh token to obtain a new access token without requiring the user to log in again.

---

## Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Request:**

The refresh token is automatically sent via HTTP-only cookie. For non-browser clients, you can also send it in the request body:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Each refresh token can only be used once. A new refresh token is automatically issued with each refresh request (token rotation).

**Refresh Token Lifetime:** 7 days

---

## API Key Authentication (#2056)

For server-to-server integrations that aren't acting on behalf of a
logged-in user's browser session, use an API key instead of a JWT
access token.

### Create a key

```bash
curl -X POST https://api.chioma.com/api/v1/developer/api-keys \
  -H "Authorization: Bearer <your-jwt-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My integration",
    "description": "Server-to-server sync job",
    "permissions": ["properties:read", "bookings:read"]
  }'
```

The response includes the key's plaintext value in the `key` field
**exactly once** (a `chioma_sk_...`-prefixed string); store it
immediately, it cannot be retrieved again. `permissions` must come from
the canonical
scope list in `backend/src/modules/developer/constants/api-scopes.ts`
(`properties:read`, `properties:write`, `bookings:read`,
`bookings:write`, `payments:read`, `analytics:read`). Keys expire after
90 days by default.

### Use the key

Send it via **either** of two equivalent header forms:

```bash
# Dedicated header
curl https://api.chioma.com/api/v1/developer/api-keys \
  -H "x-api-key: <your-api-key>"

# Or as a Bearer token on Authorization
curl https://api.chioma.com/api/v1/developer/api-keys \
  -H "Authorization: Bearer <your-api-key>"
```

Both are handled by the same `ApiKeyGuard`; it checks `x-api-key` first,
then falls back to an `Authorization: Bearer <key>` header if present.
This is safe to combine with JWT Bearer auth on a shared route: a JWT
and an API key have distinct formats (a JWT is three dot-separated
base64url segments; an API key has its own fixed prefix), so the guard
never misreads one credential type as the other.

### Current scope of API-key authentication

`ApiKeyGuard` and the scope system above are implemented and covered by
tests, but today no resource endpoint outside the `developer` module
itself (properties, bookings, payments, etc.) actually applies the
guard yet. Until those endpoints opt in, an API key only authenticates
requests to the developer/API-key-management endpoints; day-to-day
resource access still requires a JWT access token. This is a known gap
in this codebase, not something this guide or #2056 closes.

---

## Multi-Factor Authentication (MFA)

### Enable MFA

**Endpoint:** `POST /api/auth/mfa/enable`

**Headers:** `Authorization: Bearer <access_token>`

**Request (Optional):**

```json
{
  "deviceName": "My iPhone"
}
```

**Response (201 Created):**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgo...",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2",
    "G3H4I5J6",
    "K7L8M9N0"
  ]
}
```

**Setup Steps:**
1. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
2. **Save the backup codes** in a secure location
3. MFA is now active for your account

---

### Check MFA Status

**Endpoint:** `GET /api/auth/mfa/status`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "mfaEnabled": true,
  "devices": [
    {
      "id": "device-id",
      "deviceName": "My iPhone",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Regenerate Backup Codes

**Endpoint:** `POST /api/auth/mfa/backup-codes`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "backupCodes": [
    "N1O2P3Q4",
    "R5S6T7U8",
    "V9W0X1Y2",
    "Z3A4B5C6",
    "D7E8F9G0",
    "H1I2J3K4",
    "L5M6N7O8",
    "P9Q0R1S2",
    "T3U4V5W6",
    "X7Y8Z9A0"
  ]
}
```

**Note:** This generates a new set of 10 backup codes and invalidates all previous backup codes.

---

### Disable MFA

**Endpoint:** `POST /api/auth/mfa/disable`

**Headers:** `Authorization: Bearer <access_token>`

**Request:**

```json
{
  "token": "123456"
}
```

**Note:** Provide either a valid TOTP code or one of your backup codes to confirm your identity.

**Response (200 OK):**

```json
{
  "message": "MFA has been disabled successfully"
}
```

---

## Password Management

### Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Note:** For security, this endpoint always returns the same response regardless of whether the email exists in the system.

---

### Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request:**

```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecureP@ssw0rd!"
}
```

**Note:** The reset token is provided in the password reset email and expires after 1 hour.

**Response (200 OK):**

```json
{
  "message": "Password has been reset successfully"
}
```

---

### Verify Email

**Endpoint:** `GET /api/auth/verify-email?token=<verification_token>`

**Response (200 OK):**

```json
{
  "message": "Email verified successfully"
}
```

**Note:** The verification token is sent to the user's email upon registration.

---

### Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**Note:** This invalidates the refresh token server-side and clears the refresh token cookie.

---

## Error Handling

All authentication errors follow a consistent format:

**Error Response:**

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

### Common Error Codes

| Status | Error                      | Meaning                                     |
| ------ | -------------------------- | ------------------------------------------- |
| 400    | Bad Request                | Invalid request body or missing fields      |
| 401    | Unauthorized               | Invalid credentials or expired token        |
| 403    | Forbidden                  | Insufficient permissions                    |
| 409    | Conflict                   | Email already exists                        |
| 422    | Unprocessable Entity       | Password doesn't meet requirements          |
| 429    | Too Many Requests          | Rate limit exceeded                         |
| 500    | Internal Server Error      | Server error (contact support)              |

### Common Error Messages

| Message                              | Cause                                        | Solution                                      |
| ------------------------------------ | -------------------------------------------- | --------------------------------------------- |
| "Invalid email or password"          | Wrong credentials or account locked          | Check credentials, wait if account is locked  |
| "Email already exists"               | Registration with existing email             | Use a different email or login instead        |
| "Password does not meet requirements"| Password policy violation                    | Follow password requirements                  |
| "Token expired"                      | Access token or reset token expired          | Refresh token or request new reset link       |
| "Invalid MFA code"                   | Wrong TOTP code or backup code               | Check code or use backup code                 |
| "Too many requests"                  | Rate limit exceeded                          | Wait 60 seconds and try again                 |
| "MFA is already enabled"             | Attempting to enable MFA when already active | Check MFA status first                        |

---

## Rate Limits

To prevent abuse, authentication endpoints have strict rate limits:

| Endpoint                        | Limit       | Window |
| ------------------------------- | ----------- | ------ |
| `POST /auth/register`           | 3 requests  | 60 sec |
| `POST /auth/login`              | 5 requests  | 60 sec |
| `POST /auth/login/mfa/complete` | 10 requests | 60 sec |
| `POST /auth/refresh`            | 10 requests | 60 sec |
| `POST /auth/forgot-password`    | 3 requests  | 60 sec |
| `POST /auth/reset-password`     | 3 requests  | 60 sec |
| `POST /auth/stellar/challenge`  | 5 requests  | 60 sec |
| `POST /auth/stellar/verify`     | 10 requests | 60 sec |
| `POST /auth/mfa/enable`         | 5 requests  | 60 sec |
| `POST /auth/mfa/disable`        | 5 requests  | 60 sec |

When a rate limit is exceeded, you'll receive a `429 Too Many Requests` response. Wait 60 seconds before retrying.

---

## Best Practices

### Token Storage

**✅ Do:**
- Store access tokens in memory (not localStorage)
- Store refresh tokens in HTTP-only cookies (handled automatically by the API)
- Clear tokens immediately on logout

**❌ Don't:**
- Store access tokens in localStorage (vulnerable to XSS)
- Store refresh tokens in JavaScript-accessible storage
- Share tokens between different domains

---

### Token Refresh Strategy

Implement automatic token refresh to provide a seamless user experience:

```javascript
// Example: Axios interceptor for token refresh
let isRefreshing = false;
let failedQueue = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue failed requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        
        // Update access token
        setAccessToken(data.accessToken);
        
        // Retry all queued requests
        failedQueue.forEach(({ resolve }) => resolve());
        failedQueue = [];
        
        return api(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach(({ reject }) => reject(refreshError));
        failedQueue = [];
        
        // Redirect to login
        window.location.href = '/login';
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

### Security Checklist

- ✅ Always use HTTPS in production
- ✅ Implement proper CORS configuration
- ✅ Store refresh tokens in HTTP-only cookies
- ✅ Handle token expiration gracefully
- ✅ Clear all auth state on logout
- ✅ Validate user input on the client side
- ✅ Display generic error messages (don't reveal if email exists)
- ✅ Implement retry logic with exponential backoff for rate limits
- ✅ Enable MFA for sensitive accounts
- ✅ Store MFA backup codes securely offline

---

### User Experience Tips

**Registration:**
- Show real-time password strength feedback
- Display password requirements before submission
- Send welcome email after successful registration
- Auto-login users after registration

**Login:**
- Remember email (not password) with user consent
- Show loading states during authentication
- Provide clear error messages without security details
- Offer password reset link on login failure

**MFA:**
- Clearly explain MFA benefits during onboarding
- Provide step-by-step setup instructions with screenshots
- Emphasize the importance of saving backup codes
- Allow users to download or print backup codes

**Token Management:**
- Automatically refresh tokens before expiration
- Handle refresh failures gracefully (redirect to login)
- Preserve user's place in the app after token refresh
- Show session timeout warnings before expiration

---

## Interactive API Documentation

For hands-on testing and exploration of all authentication endpoints:

**Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs) (when the server is running)

**OpenAPI Spec:** [http://localhost:5000/api/docs-json](http://localhost:5000/api/docs-json)

---

## Support

For additional help:

- **Full Documentation:** [../AUTHENTICATION.md](../AUTHENTICATION.md)
- **API Reference:** [./api-documentation.md](./api-documentation.md)
- **Usage Guide:** [./USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Security:** [../SECURITY.md](../SECURITY.md)

---

**Last Updated:** January 2024
