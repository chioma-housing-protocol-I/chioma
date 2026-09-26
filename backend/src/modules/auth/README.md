# Auth Module - Complete Guide

## 📋 Overview

The Auth module implements a secure, production-ready authentication system for the Chioma application. It provides comprehensive user authentication, password management, and security features following OWASP best practices.

## 🎯 Features

### Core Authentication

- User registration with email validation
- Login/logout with session management
- JWT-based token authentication
- Refresh token mechanism
- Password reset flow

### Security

- Bcrypt password hashing (12 salt rounds)
- Account lockout after failed attempts
- Rate limiting on auth endpoints
- Secure token generation and storage
- No sensitive data logging

## 📁 Directory Structure

```
src/modules/auth/
├── dto/                              # Data validation schemas
│   ├── register.dto.ts               # Registration data
│   ├── login.dto.ts                  # Login credentials
│   ├── forgot-password.dto.ts        # Password reset request
│   ├── reset-password.dto.ts         # Password reset with token
│   ├── refresh-token.dto.ts          # Token refresh request
│   └── auth-response.dto.ts          # Response schemas
│
├── strategies/                        # Passport JWT strategies
│   ├── jwt.strategy.ts               # Access token validation
│   └── refresh-token.strategy.ts     # Refresh token validation
│
├── guards/                            # Route protection guards
│   ├── jwt-auth.guard.ts             # JWT token guard
│   └── refresh-token.guard.ts        # Refresh token guard
│
├── middleware/                        # Custom middleware
│   └── rate-limit.middleware.ts      # Request rate limiting
│
├── auth.service.ts                   # Business logic
├── auth.controller.ts                # API endpoints
├── auth.module.ts                    # Module configuration
├── auth.service.spec.ts              # Service tests
├── auth.controller.spec.ts           # Controller tests
└── index.ts                          # Module exports
```

## 🚀 Quick Start

### 1. Import AuthModule

```typescript
// src/app.module.ts
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ... other modules
    AuthModule,
  ],
})
export class AppModule {}
```

### 2. Use JwtAuthGuard for Protected Routes

```typescript
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('profile')
  getProfile(@Request() req) {
    // req.user contains: { id, email, role }
    return req.user;
  }
}
```

### 3. Send Requests with JWT Token

```bash
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/users/profile
```

## 🔐 Security Features in Detail

### Password Hashing

Uses bcrypt with 12 salt rounds - industry standard for password hashing.

```typescript
// Hashing
const hash = await bcrypt.hash(password, 12);

// Verification
const isValid = await bcrypt.compare(password, hash);
```

**Why bcrypt?**

- Intentionally slow to prevent brute force attacks
- Built-in salt handling
- Adaptive algorithm (can increase rounds as compute power increases)
- Widely tested and trusted

### Account Lockout

Prevents brute force attacks by locking accounts after repeated failed login attempts.

```typescript
Configuration:
- Max failed attempts allowed: 5 (lockout triggers on the 6th attempt)
- Lockout duration: 30 minutes
- Automatic unlock: After timeout expires
- Failed attempts reset: On successful login
```

### Rate Limiting

Protects against automated attacks on auth endpoints.

```typescript
Configuration:
- Window: 15 minutes
- Max requests: 5 per IP
- Applied to: register, login, forgot-password, reset-password
```

### JWT Tokens

Two-token system balances security and usability.

```typescript
Access Token:
- Expiry: 15 minutes
- Used for: API requests
- Stored: In client (localStorage/sessionStorage)
- Risk: Short window if compromised

Refresh Token:
- Expiry: 7 days
- Used for: Getting new access tokens
- Stored: Bcrypt hashed in database
- Risk: Longer window mitigated by hash storage
```

### Password Reset

Secure flow for password recovery.

```typescript
Process:
1. User requests reset with email
2. System generates random token
3. Token is SHA256 hashed and stored
4. User receives unhashed token via email
5. User provides token and new password
6. System validates token (hash comparison)
7. Password is updated and token cleared
```

## 📚 API Reference

### POST /auth/register

Register a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "tenant"
}
```

**Response (201):**

```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "tenant"
  }
}
```

### POST /auth/login

Authenticate user with credentials.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "user": { ... }
}
```

**Errors:**

- `401` - Invalid credentials
- `401` - Account locked (try again in X minutes)

### POST /auth/logout

Logout the current user.

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

### POST /auth/refresh

Get a new access token using refresh token.

**Request:**

```json
{
  "refreshToken": "jwt..."
}
```

**Response (200):**

```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

### POST /auth/forgot-password

Request a password reset email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "message": "If an account exists with this email, you will receive a password reset link."
}
```

### POST /auth/reset-password

Reset password with token from email.

**Request:**

```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**

```json
{
  "message": "Password has been reset successfully."
}
```

## 🧪 Testing

### Unit Tests

Test individual service and controller methods:

```bash
npm test src/modules/auth
```

Coverage includes:

- Registration with validation
- Login with various scenarios
- Token generation and refresh
- Password reset flow
- Account lockout logic
- Error handling

### Integration Tests

Test complete authentication flows:

```bash
npm run test:e2e test/auth.e2e-spec.ts
```

Coverage includes:

- Full registration flow
- Full login flow
- Token refresh flow
- Password reset flow
- Rate limiting
- Error scenarios

## 🔧 Configuration

### Environment Variables

```bash
# JWT Secrets (minimum 32 characters recommended)
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Database (existing)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=chioma_db

# Application
NODE_ENV=development
PORT=3000
```

### Customization

You can customize the auth behavior by modifying constants in `auth.service.ts`:

```typescript
// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5; // Change to 3, 10, etc.
const LOCKOUT_DURATION_MINUTES = 15; // Change duration

// Token expiry
expiresIn: '15m'; // Access token
expiresIn: '7d'; // Refresh token

// Password reset
const RESET_TOKEN_EXPIRY_MINUTES = 60; // Change to 30, 120, etc.
```

Rate limiting in `middleware/rate-limit.middleware.ts`:

```typescript
const WINDOW_MS = 15 * 60 * 1000; // Time window
const MAX_REQUESTS = 5; // Requests allowed
```

## 📖 Usage Examples

### TypeScript/Node.js

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Register
async function register() {
  const response = await api.post('/auth/register', {
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'tenant',
  });

  const { accessToken, refreshToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

// Use access token
async function getProfile() {
  const accessToken = localStorage.getItem('accessToken');
  const response = await api.get('/users/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

// Refresh token when expired
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await api.post('/auth/refresh', { refreshToken });

  const { accessToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
}

// Logout
async function logout() {
  const accessToken = localStorage.getItem('accessToken');
  await api.post(
    '/auth/logout',
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

### React Example

```typescript
import { useState, useCallback } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken');
    await fetch('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return { user, loading, error, login, logout };
}
```

## 🐛 Troubleshooting

### "Account is locked"

The account is locked due to too many failed login attempts.

**Solution:**

- Wait 15 minutes for automatic unlock
- Or contact admin to unlock manually

### "Invalid refresh token"

The refresh token is expired or invalid.

**Solution:**

- Login again to get new tokens
- Ensure token wasn't used more than once

### "Password does not meet requirements"

Password doesn't meet the security policy.

**Solution:**
Ensure password contains:

- 8-128 characters
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Number (0-9)
- Special character (@$!%\*?&)

Example: `SecurePass123!`

### "Too many requests"

Rate limit exceeded on auth endpoint.

**Solution:**

- Wait 15 minutes for rate limit window to reset
- Reduce number of requests to auth endpoints

## 🔄 Token Refresh Strategy

The recommended approach for client-side token management:

```typescript
// Intercept API calls
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken } = response.data;

      localStorage.setItem('accessToken', accessToken);

      // Retry original request
      return api(error.config);
    }
    throw error;
  },
);
```

## 📊 Security Best Practices

### For Developers

1. **Never hardcode secrets** - Use environment variables
2. **Always use HTTPS** - Encrypt tokens in transit
3. **Store tokens securely** - Use httpOnly cookies when possible
4. **Validate input** - DTOs handle this
5. **Log appropriately** - No password/token logging
6. **Handle errors gracefully** - Don't leak information
7. **Implement CORS** - Restrict origins if needed
8. **Update dependencies** - Keep bcrypt and JWT libs current

### For Deployment

1. Generate strong JWT secrets (minimum 32 characters)
2. Enable HTTPS/TLS
3. Set secure CORS policies
4. Monitor failed login attempts
5. Set up alerts for suspicious activity
6. Regularly rotate JWT secrets
7. Keep dependencies updated
8. Monitor rate limit effectiveness

## 📝 Database Schema

The auth module uses these fields in the `users` table:

| Field                    | Type      | Purpose           |
| ------------------------ | --------- | ----------------- |
| `id`                     | UUID      | User ID           |
| `email`                  | VARCHAR   | Unique email      |
| `password_hash`          | VARCHAR   | Bcrypt hash       |
| `refresh_token`          | VARCHAR   | Stored JWT hash   |
| `password_reset_token`   | VARCHAR   | SHA256 token hash |
| `reset_token_expires_at` | TIMESTAMP | Token expiry      |
| `account_locked`         | BOOLEAN   | Lockout status    |
| `failed_login_attempts`  | INT       | Attempt counter   |
| `locked_until`           | TIMESTAMP | Lock expiry       |

## 🚢 Deployment

### Before Going Live

1. [ ] Generate strong JWT secrets
2. [ ] Set up email service for password resets
3. [ ] Enable HTTPS/TLS
4. [ ] Configure CORS properly
5. [ ] Set up monitoring/logging
6. [ ] Run security tests
7. [ ] Load testing on rate limits
8. [ ] Database backups configured
9. [ ] Documentation updated
10. [ ] Team trained on security

### Environment Setup

```bash
# Production
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
# ... other variables
```

## 🤝 Contributing

When modifying the auth module:

1. Run tests: `npm test src/modules/auth`
2. Check coverage: `npm run test:cov`
3. Update documentation if changing behavior
4. Follow existing code style
5. Add tests for new features

## 📞 Support

For issues or questions:

1. Check [AUTH_API_DOCUMENTATION.md](./AUTH_API_DOCUMENTATION.md)
2. Check [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
3. Review test files for examples
4. Check NestJS documentation

## 📄 License

This authentication module is part of the Chioma project and follows the same license.

---

**Last Updated**: January 25, 2026
**Status**: Production Ready ✅
