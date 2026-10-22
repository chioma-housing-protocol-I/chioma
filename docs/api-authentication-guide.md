# API Authentication Guide

Chioma's API supports two authentication mechanisms: short-lived **Bearer (JWT) tokens** for user-session requests, and long-lived **API keys** for server-to-server integrations. All endpoints are served under `/api/v1` (see `backend/src/main.ts`'s global prefix and default URI versioning).

## Bearer tokens (JWT)

Use this for any request made on behalf of a logged-in user (web app, mobile app, first-party clients).

### 1. Log in to get an access token

```bash
curl -X POST https://api.chioma.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "password": "your-password"
  }'
```

Response (`200 OK`):

```json
{
  "accessToken": "<JWT_ACCESS_TOKEN>",
  "user": { "id": "...", "email": "you@example.com" }
}
```

The refresh token is set as an HTTP-only cookie, not returned in the response body. If multi-factor authentication is enabled on the account, the response instead contains `{ "mfaRequired": true, "mfaToken": "..." }`; complete the flow via `POST /api/v1/auth/login/mfa/complete`.

### 2. Send the access token on every request

```bash
curl https://api.chioma.app/api/v1/users/me \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>"
```

```javascript
const response = await fetch("https://api.chioma.app/api/v1/users/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

```python
import requests

response = requests.get(
    "https://api.chioma.app/api/v1/users/me",
    headers={"Authorization": f"Bearer {access_token}"},
)
```

### 3. Refresh the token before it expires

The access token is short-lived. Call `POST /api/v1/auth/refresh` (the refresh-token cookie is sent automatically by the browser) to get a new access token without asking the user to log in again.

```bash
curl -X POST https://api.chioma.app/api/v1/auth/refresh \
  --cookie "refreshToken=<cookie-value>"
```

## API keys

Use this for server-to-server integrations that are not acting on behalf of a specific logged-in user's browser session.

### 1. Create an API key

API keys are created from an authenticated (Bearer) session, via the developer portal endpoints in `backend/src/modules/developer/developer.controller.ts`:

```bash
curl -X POST https://api.chioma.app/api/v1/developer/api-keys \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My integration",
    "description": "Integration for external service",
    "permissions": ["properties:read", "bookings:read"]
  }'
```

The response includes the key's plaintext value in the `key` field **exactly once**, along with `id`, `name`, and `expiresAt` (API keys expire after 90 days by default). Store the key immediately: it cannot be retrieved again (only rotated, via `POST /api/v1/developer/api-keys/:id/rotate`).

`permissions` must come from the canonical scope list in `backend/src/modules/developer/constants/api-scopes.ts`:

- `properties:read`
- `properties:write`
- `bookings:read`
- `bookings:write`
- `payments:read`
- `analytics:read`

### 2. Send the API key on every request

API keys are sent via the `x-api-key` header (see `ApiKeyGuard`, `backend/src/modules/developer/guards/api-key.guard.ts`), not as a Bearer token:

```bash
curl https://api.chioma.app/api/v1/developer/api-keys \
  -H "x-api-key: <API_KEY>"
```

```javascript
const response = await fetch("https://api.chioma.app/api/v1/developer/api-keys", {
  headers: {
    "x-api-key": apiKey,
  },
});
```

```python
import requests

response = requests.get(
    "https://api.chioma.app/api/v1/developer/api-keys",
    headers={"x-api-key": api_key},
)
```

An invalid, expired, or revoked key returns `401 Unauthorized` with `code: "API_KEY_INVALID"`. A valid key missing a required scope for the endpoint returns `403 Forbidden` with `code: "API_KEY_SCOPE_INSUFFICIENT"`.

> **Current scope of API-key authentication:** `ApiKeyGuard` and the scope system above are implemented and fully covered by tests, but today no resource endpoint outside the `developer` module (properties, bookings, payments, etc.) actually applies the guard yet. Until those endpoints opt in, an API key only authenticates requests to the developer/API-key-management endpoints themselves; day-to-day resource access still requires a Bearer token. This is a known gap, not an oversight — track it if you're building an integration that needs key-based access to resource data.

## Choosing between the two

| | Bearer (JWT) | API key |
|---|---|---|
| Who it's for | A logged-in user's own session | A server-side integration, no interactive user |
| Lifetime | Short (minutes/hours), refreshed via cookie | Long-lived until rotated or revoked |
| Header | `Authorization: Bearer <token>` | `x-api-key: <key>` |
| Scoping | Whatever the logged-in user is allowed to do | Explicit `permissions` list chosen at creation |
| Where it's enforced today | Most endpoints (`JwtAuthGuard`) | Developer/API-key-management endpoints only (see note above) |

## Error responses

Both mechanisms return a consistent error shape on failure:

```json
{
  "message": "Invalid, expired, or revoked API key",
  "code": "API_KEY_INVALID"
}
```

A request with no credentials at all, to an endpoint that requires them, returns `401 Unauthorized`.
