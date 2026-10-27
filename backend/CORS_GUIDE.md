# CORS Configuration Guide

## Overview

Cross-Origin Resource Sharing (CORS) is a security feature that controls which domains can access the Chioma API. This guide explains how CORS is configured and how to customize it for different environments.

## Table of Contents

1. [What is CORS?](#what-is-cors)
2. [Configuration](#configuration)
3. [Environment Variables](#environment-variables)
4. [Security Best Practices](#security-best-practices)
5. [Troubleshooting](#troubleshooting)
6. [Examples](#examples)

## What is CORS?

CORS is a browser security feature that prevents web pages from making requests to a different domain than the one that served the web page. The Chioma API uses CORS to:

- Allow legitimate frontend applications to access the API
- Block unauthorized domains from accessing the API
- Control which HTTP methods and headers are allowed
- Manage credentials (cookies, authentication) in cross-origin requests

## Configuration

CORS is configured in `src/config/cors.config.ts` and applied in `src/main.ts`.

### Default Configuration

```typescript
{
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-XSRF-TOKEN',
    'X-CSRF-Token',
    'X-API-Key',
    'X-Webhook-Signature',
    'X-Webhook-Timestamp',
    'Accept',
    'Accept-Language',
    'Content-Language',
    'X-Idempotency-Key',
    'X-Client-Version',
    'X-Device-ID',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID',
    'X-Response-Time',
    'X-Total-Count',
    'Link',
    'ETag',
    'X-API-Version',
  ],
  maxAge: 86400, // 24 hours
}
```

## Environment Variables

### CORS_ORIGINS

Comma-separated list of allowed origins.

```bash
# Single origin
CORS_ORIGINS=http://localhost:3000

# Multiple origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,https://app.example.com

# Wildcard subdomain (*.example.com)
CORS_ORIGINS=*.chioma.com,https://admin.chioma.com

# Production example
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com,https://mobile.chioma.com
```

**Important**: If `CORS_ORIGINS` is not set, it defaults to the `FRONTEND_URL` environment variable or `http://localhost:3000`.

### CORS_CREDENTIALS

Whether to allow credentials (cookies, authorization headers) in cross-origin requests.

```bash
# Allow credentials (default: true)
CORS_CREDENTIALS=true

# Disallow credentials
CORS_CREDENTIALS=false
```

**Important**: When `CORS_CREDENTIALS=true`, you cannot use wildcard (`*`) for `CORS_ORIGINS`. You must specify exact origins.

### CORS_MAX_AGE

How long (in seconds) browsers should cache preflight request results.

```bash
# Default: 24 hours
CORS_MAX_AGE=86400

# 1 hour
CORS_MAX_AGE=3600

# 7 days
CORS_MAX_AGE=604800
```

## Security Best Practices

### 1. Never Use Wildcard in Production

```bash
# ❌ NEVER DO THIS IN PRODUCTION
CORS_ORIGINS=*

# ✅ Always specify exact origins
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com
```

### 2. Use HTTPS in Production

```bash
# ❌ Bad - HTTP in production
CORS_ORIGINS=http://app.example.com

# ✅ Good - HTTPS only
CORS_ORIGINS=https://app.example.com
```

### 3. Limit Origins to Known Domains

Only add origins that you control and trust:

```bash
# ✅ Good - Only your domains
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com

# ❌ Bad - Including untrusted domains
CORS_ORIGINS=https://app.chioma.com,https://random-site.com
```

### 4. Wildcard Subdomains

Use wildcard subdomains carefully:

```bash
# Allows: app.chioma.com, admin.chioma.com, any.chioma.com
CORS_ORIGINS=*.chioma.com

# More secure - explicit subdomains
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com
```

### 5. Separate Environments

Use different CORS configurations for each environment:

```bash
# .env.development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# .env.staging
CORS_ORIGINS=https://staging.chioma.com
CORS_CREDENTIALS=true

# .env.production
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com
CORS_CREDENTIALS=true
```

## Validation

The CORS configuration is validated on startup. Check the logs for warnings:

```
[CorsConfig] CORS configured for environment: production
[CorsConfig] Allowed origins: https://app.chioma.com, https://admin.chioma.com
[CorsConfig] Credentials enabled: true
```

### Common Warnings

**Wildcard origin in production:**
```
[CorsConfig] CRITICAL: Wildcard CORS origin (*) detected in production! This is a security risk.
```

**HTTP origin in production:**
```
[CorsConfig] WARNING: Non-HTTPS origin detected in production: http://app.example.com
```

**Localhost in production:**
```
[CorsConfig] WARNING: Localhost origin detected in production: http://localhost:3000
```

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Problem**: Browser blocks the request because the origin is not allowed.

**Solution**: Add your frontend origin to `CORS_ORIGINS`:

```bash
CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### CORS Error: "Credentials flag is 'true', but 'Access-Control-Allow-Credentials' header is ''"

**Problem**: Frontend is sending credentials but server doesn't allow it.

**Solution**: Enable credentials:

```bash
CORS_CREDENTIALS=true
```

### CORS Error: "Origin not allowed by CORS policy"

**Problem**: The origin making the request is not in the allowed list.

**Solutions**:

1. **Check the origin**: Look at the browser error for the actual origin
   ```
   Origin 'http://localhost:3001' is not allowed
   ```

2. **Add the origin**:
   ```bash
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

3. **Check for typos**: Ensure the origin matches exactly (including protocol and port)
   ```bash
   # ❌ Wrong
   CORS_ORIGINS=localhost:3000
   
   # ✅ Correct
   CORS_ORIGINS=http://localhost:3000
   ```

### Preflight Request Fails

**Problem**: OPTIONS request fails before the actual request.

**Solution**: CORS preflight requests are automatically handled. Check:

1. **Origin is allowed**:
   ```bash
   CORS_ORIGINS=https://your-frontend.com
   ```

2. **Headers are allowed**: Custom headers should be in `allowedHeaders`
   ```typescript
   // In cors.config.ts, add your custom header
   allowedHeaders: [
     'Content-Type',
     'Authorization',
     'Your-Custom-Header', // Add here
   ]
   ```

3. **Method is allowed**: Check if the HTTP method is in the allowed methods

## Examples

### Development Setup

```bash
# .env.development
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
CORS_CREDENTIALS=true
CORS_MAX_AGE=3600
```

### Staging Setup

```bash
# .env.staging
NODE_ENV=staging
CORS_ORIGINS=https://staging.chioma.com,https://staging-admin.chioma.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

### Production Setup

```bash
# .env.production
NODE_ENV=production
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

### Mobile App Setup

For mobile apps (React Native, Flutter, etc.), you typically don't need to configure CORS because:

1. **Native apps don't have origin**: They don't send an `Origin` header
2. **CORS is a browser policy**: It doesn't apply to native mobile apps

However, if using WebView, add the mobile app domain:

```bash
CORS_ORIGINS=https://app.chioma.com,https://mobile.chioma.com
```

### Multiple Frontend Apps

If you have separate frontend apps (user portal, admin portal, mobile web):

```bash
CORS_ORIGINS=https://app.chioma.com,https://admin.chioma.com,https://m.chioma.com
```

### Testing with Postman/cURL

Postman and cURL don't enforce CORS (they're not browsers), so:

1. **No origin header**: Requests without origin are allowed
2. **Testing CORS**: Use browser DevTools Network tab to test CORS
3. **curl example**:
   ```bash
   curl -X GET https://api.chioma.com/health \
     -H "Origin: https://app.chioma.com" \
     -v
   ```

## Dynamic Origin Validation

The CORS configuration supports dynamic origin validation:

```typescript
origin: (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl)
  if (!origin) {
    return callback(null, true);
  }

  // Check if origin is in whitelist
  const isAllowed = corsOrigins.some((allowedOrigin) => {
    // Support wildcard subdomains (*.example.com)
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain);
    }
    return origin === allowedOrigin;
  });

  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
  }
}
```

## Headers Reference

### Allowed Headers (Request)

These headers can be sent by the client:

- `Content-Type` - Request body type (e.g., application/json)
- `Authorization` - JWT token
- `X-Request-ID` - Request tracking
- `X-XSRF-TOKEN` / `X-CSRF-Token` - CSRF protection
- `X-API-Key` - API key authentication
- `X-Webhook-Signature` - Webhook verification
- `X-Webhook-Timestamp` - Webhook timestamp
- `Accept` - Accepted response types
- `Accept-Language` - Preferred language
- `X-Idempotency-Key` - Idempotency for retries
- `X-Client-Version` - Client app version
- `X-Device-ID` - Device identifier

### Exposed Headers (Response)

These headers are accessible to the client JavaScript:

- `X-RateLimit-Limit` - Rate limit maximum
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Rate limit reset time
- `X-Request-ID` - Request tracking ID
- `X-Response-Time` - Request processing time
- `X-Total-Count` - Pagination total count
- `Link` - Pagination links
- `ETag` - Resource version for caching
- `X-API-Version` - API version

## Testing CORS

### Browser DevTools

1. Open browser DevTools (F12)
2. Go to Network tab
3. Make a request to the API
4. Check the response headers:
   ```
   Access-Control-Allow-Origin: https://your-frontend.com
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
   ```

### cURL Testing

Test CORS with cURL:

```bash
# Test preflight request
curl -X OPTIONS https://api.chioma.com/api/users \
  -H "Origin: https://app.chioma.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Test actual request
curl -X GET https://api.chioma.com/api/users \
  -H "Origin: https://app.chioma.com" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

### Frontend Testing

```javascript
// React/Next.js example
fetch('https://api.chioma.com/api/users', {
  method: 'GET',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => {
  console.error('CORS Error:', error);
});
```

## Related Documentation

- [Security Guide](./SECURITY.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Environment Variables](./docs/environment-variables.md)

## Support

For CORS-related issues:
- Check server logs for CORS warnings
- Verify environment variables are set correctly
- Test with browser DevTools Network tab
- Contact: support@chioma.app
