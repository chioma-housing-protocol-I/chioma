# SDK Generation

The Chioma API exposes an OpenAPI 3.0 spec at `/api/docs-json` (when the server is running) or via a static file generated with:

```bash
pnpm run openapi:generate
```

This produces `openapi.json` in the backend root. Use it to generate client SDKs and keep **cURL** examples in sync.

## Generate clients

### Option 1: OpenAPI Generator (JavaScript, TypeScript, Python, etc.)

Install [OpenAPI Generator](https://openapi-generator.tech/docs/installation) (Docker or CLI), then for example:

**JavaScript (axios):**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i backend/openapi.json \
  -g javascript \
  -o sdk-js
```

**TypeScript (fetch):**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i backend/openapi.json \
  -g typescript-fetch \
  -o sdk-ts
```

**Python:**
```bash
npx @openapitools/openapi-generator-cli generate \
  -i backend/openapi.json \
  -g python \
  -o sdk-python
```

### Option 2: Swagger Codegen

Use [Swagger Codegen](https://github.com/swagger-api/swagger-codegen) with `openapi.json` for other languages.

### cURL examples

Swagger UI at `/api/docs` provides "Try it out" for each endpoint and shows **cURL** commands. For custom scripts, use the same base URL and add:

```bash
-H "Authorization: Bearer YOUR_JWT"
-H "Content-Type: application/json"
```

## CI

The backend CI pipeline generates the OpenAPI spec and validates it. Generated SDKs should be built from this spec (or from the published `openapi.json` artifact) for consistency.
