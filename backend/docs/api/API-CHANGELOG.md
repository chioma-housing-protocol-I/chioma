# API Changelog

All notable changes to the Chioma REST API are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0] - 2025-02

### Added

- **OpenAPI 3.0**
  - Full OpenAPI 3.0 specification with tags, security (JWT), and endpoint documentation.
  - Interactive docs at `GET /api/docs` (Swagger UI).
  - Machine-readable spec at `GET /api/docs-json`.
- **Documented areas**
  - Authentication (register, login, MFA, password reset, Stellar SEP-0010).
  - Users, Rent Agreements, Properties, Payments, Stellar, Anchor, Disputes, Audit, Security, Health, Storage, Reviews, KYC, Maintenance, System.
- **API quality**
  - E2E tests for API docs (Swagger UI and spec validity).
  - E2E contract tests for health, security.txt, and auth/protected endpoint behavior.
  - CI job to generate OpenAPI spec and run docs/contract tests.
- **Docker**
  - `docker-compose.docs.yml` to run API + DB + Redis and access docs at `http://localhost:5000/api/docs`.
- **Versioning**
  - URI versioning enabled (default v1). Strategy described in [API-VERSIONING.md](./API-VERSIONING.md).

### Developer experience

- Script: `pnpm run openapi:generate` to emit `openapi.json` for SDK generation or static hosting.
- Code examples and request/response examples in Swagger where applicable.

---

For versioning policy and future versions, see [API-VERSIONING.md](./API-VERSIONING.md).
