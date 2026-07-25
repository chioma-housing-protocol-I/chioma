# CSRF Protection Implementation

## Overview
CSRF (Cross-Site Request Forgery) protection is implemented globally via the `CsrfMiddleware` which is applied to all routes in `app.module.ts`.

## Implementation Details

### Global Middleware
The CSRF middleware is registered in `app.module.ts`:
```typescript
consumer.apply(CsrfMiddleware).forRoutes('*');
```

### Middleware Behavior
- **Enabled**: Controlled by `SECURITY_CSRF_ENABLED` environment variable
- **Safe Methods**: GET, HEAD, OPTIONS are exempt (tokens are generated for these)
- **Excluded Paths**: `/health`, `/api/docs`, `/security.txt`
- **Validation**: Double-submit cookie pattern using XSRF-TOKEN cookie and X-XSRF-TOKEN header

### Token Generation
- Tokens are generated using HMAC-SHA256 with a secret
- Tokens include timestamp for expiration (24 hours)
- Tokens are set as HTTP-only cookies with secure flags in production

### Validation
For state-changing methods (POST, PUT, DELETE, PATCH):
1. Both header token and cookie token must be present
2. Tokens must match exactly (double-submit pattern)
3. HMAC signature is validated
4. Token age is checked (max 24 hours)

### Environment Variables
- `SECURITY_CSRF_ENABLED`: Enable/disable CSRF protection (default: false)
- `SECURITY_SESSION_SECRET` or `JWT_SECRET`: Secret key for token generation

### Decorator Usage
The `@RequireCsrf()` decorator is available for documentation purposes and can be used to explicitly mark endpoints that require CSRF protection:

```typescript
import { RequireCsrf } from '../common/decorators/require-csrf.decorator';

@Post('endpoint')
@RequireCsrf()
async handler() { ... }
```

### Security Configuration
- **Development**: CSRF can be disabled for testing
- **Production**: CSRF must be enabled with secure cookie flags
- **Cookie Settings**: httpOnly: false (required for double-submit), secure: true in production, sameSite: strict

## Testing
CSRF protection should be tested by:
1. Verifying tokens are generated on GET requests
2. Attempting state changes without tokens (should return 403)
3. Attempting state changes with invalid tokens (should return 403)
4. Verifying token expiration after 24 hours
