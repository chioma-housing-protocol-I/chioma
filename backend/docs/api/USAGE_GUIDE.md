# Chioma API Usage Guide

Step-by-step guide for integrating with the Chioma backend API.

## Prerequisites

- Backend running locally (`pnpm run start:dev`) or access to a deployed instance
- HTTP client (curl, Postman, or generated SDK)
- For on-chain features: Stellar testnet wallet (see [Stellar module README](../../src/modules/stellar/README.md))

Default local base URL: `http://localhost:5000`

## 1. Verify the API is up

```bash
curl http://localhost:5000/health
```

Expected: JSON with `"status": "ok"` (or `"warning"` if a dependency is degraded).

Browse interactive docs: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

## 2. Register a user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "SecurePass123!",
    "firstName": "Dev",
    "lastName": "User",
    "role": "tenant"
  }'
```

Response includes `accessToken` and user metadata. Store the access token securely.

**Roles:** `tenant`, `landlord`, `agent`, `admin` (availability may vary by environment).

## 3. Authenticate (login)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "SecurePass123!"
  }'
```

If MFA is enabled, the response indicates MFA is required; complete via `POST /api/auth/login/mfa/complete`.

## 4. Call protected endpoints

```bash
export TOKEN="<accessToken from login>"

curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Create an API key (server integrations)

Requires JWT authentication:

```bash
curl -X POST http://localhost:5000/api/developer/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My integration"}'
```

Save the returned `key` immediately — it is not shown again.

Use the key on subsequent requests:

```bash
curl http://localhost:5000/api/users/me \
  -H "X-API-Key: chioma_sk_..."
```

Manage keys: list (`GET /api/developer/api-keys`), rotate (`POST .../rotate`), revoke (`DELETE .../:id`).

## 6. Common workflows

### Browse properties (public)

```bash
curl "http://localhost:5000/api/properties?page=1&limit=10"
```

Response shape: `{ "data": [...], "meta": { "total", "page", "limit" } }`.

### Create a rent agreement (authenticated)

```bash
curl -X POST http://localhost:5000/api/agreements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "<uuid>",
    "tenantId": "<uuid>",
    "startDate": "2026-06-01",
    "endDate": "2027-05-31",
    "monthlyRent": 150000,
    "currency": "NGN"
  }'
```

See Swagger for required fields per agreement type.

### Submit feedback (public)

```bash
curl -X POST http://localhost:5000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Great API documentation!",
    "type": "general"
  }'
```

## 7. Refresh tokens

When the access token expires:

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh_token>"}'
```

Or rely on the HTTP-only refresh cookie when using browser clients with credentials.

## 8. Generate client SDKs

```bash
cd backend
pnpm run openapi:generate
pnpm run sdk:generate
```

Install the TypeScript client from `sdks/typescript-fetch/` or import the OpenAPI spec into your tooling. See [SDK Generation](./SDK-GENERATION.md) for details.

## 9. Run tests against your integration

The repo includes contract and documentation E2E tests:

```bash
cd backend
pnpm run test:e2e -- --testPathPattern="api-docs|api-contract|integration"
```

Requires PostgreSQL for full E2E; unit tests use in-memory SQLite.

## 10. Pre-push checklist

Before opening a PR:

```bash
cd backend
make ci
```

This runs: install → format check → lint → typecheck → tests with coverage → build.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Token expired or missing; refresh or re-login |
| `400 Bad Request` | Check request body against Swagger schemas |
| `429 Too Many Requests` | Back off; check `retryAfter` in response |
| CORS errors in browser | Add your origin to `CORS_ORIGINS` |
| OpenAPI generate fails | Set `DB_TYPE=sqlite`, `JWT_SECRET`, and contract IDs (see `scripts/ci-local.sh`) |

## Next steps

- [API Overview](./api-documentation.md) — full reference
- [Authentication Guide](./AUTHENTICATION.md) — JWT and Stellar auth
- [Developer portal](http://localhost:5000/developer-portal) — quick links when server is running
- [Auth API reference](../../src/modules/auth/AUTH_API_DOCUMENTATION.md) — MFA, password reset, endpoint table
