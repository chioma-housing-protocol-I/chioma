# API Versioning Strategy

## Current version

- **API version:** 1.0
- **Versioning type:** URI (path). Default version is `1`; future versions may use `/api/v2/...`.

## Policy

1. **Stability:** We avoid breaking changes to existing endpoints. New fields and new endpoints are added in a backward-compatible way.
2. **Deprecation:** Deprecated endpoints or parameters are announced in this changelog and in OpenAPI `deprecated: true`. A minimum of one major version or 6 months notice is given before removal.
3. **New versions:** Breaking changes are released under a new API version (e.g. v2). The previous version remains supported for a defined period.

## Version in requests

- Base URL includes no version segment for v1: `https://api.chioma.app/api/...`
- NestJS `enableVersioning(VersioningType.URI)` is configured with `defaultVersion: '1'`. Optional explicit versioning (e.g. `/api/v2/...`) can be added when v2 is introduced.

## OpenAPI

- The served spec at `/api/docs-json` and any generated `openapi.json` use `info.version` (e.g. `1.0`) to reflect the current API version.
- Changelog and release notes are kept in [API-CHANGELOG.md](./API-CHANGELOG.md).
