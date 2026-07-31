# API Versioning Strategy

This document defines the strategy for versioning, deprecating, and migrating the Chioma API. Following these guidelines ensures stability for our clients and a predictable upgrade path for developers.

---

## 1. Versioning Approach

### URI-Based Versioning (Path)

Chioma uses **URI Versioning** for major API versions. This approach makes it easy to track versions in server logs and enables side-by-side deployment of multiple versions.

- **v1 (Current):** `https://api.chioma.app/api/...`
- **v2 (Future):** `https://api.chioma.app/api/v2/...`

> [!NOTE]
> The `/api` prefix without a version segment defaults to **v1** via the NestJS `defaultVersion: '1'` configuration.

---

## 2. Version Format

We follow **Semantic Versioning (SemVer) 2.0.0** for our API releases, although only the **Major** version is reflected in the URI path.

- **Major Version (vX):** Incremented for **breaking changes**. Requires a new URI path and a migration period.
- **Minor Version (.Y):** Incremented for **backward-compatible features** (e.g., new endpoints, new optional fields).
- **Patch Version (.Z):** Incremented for **backward-compatible bug fixes**.

The full version (e.g., `1.2.3`) is documented in `API-CHANGELOG.md` and reflected in the `info.version` field of the OpenAPI specification.

---

## 3. Backward Compatibility

Maintaining backward compatibility is our highest priority to protect client integrations.

### Non-Breaking Changes (SAFE)

- Adding new endpoints.
- Adding new optional request parameters or headers.
- Adding new properties to response JSON.
- Changing the order of properties in response JSON (clients must handle JSON as unordered maps).
- Adding new values to an Enum (clients must handle unknown values gracefully).

### Breaking Changes (UNSAFE)

- Removing or renaming endpoints or parameters.
- Changing the data type of a property (e.g., String to Integer).
- Making an optional parameter required.
- Removing properties from response JSON.
- Changing error codes or significant logic flow.
- Changing authentication/authorization requirements.

---

## 4. Version Lifecycle

Every API version progresses through the following stages:

| Stage                 | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| **Experimental**      | Internal testing/Beta. Subject to change without notice.                 |
| **Stable (Active)**   | Current production version. Fully supported with backward compatibility. |
| **Deprecated**        | A newer version exists. Support continues but removal is scheduled.      |
| **End-of-Life (EOL)** | Version is no longer supported and may be removed from servers.          |

---

## 5. Deprecation Policy

When a breaking change is unavoidable, we follow a strict deprecation process.

1.  **Notice Period:** A minimum of **6 months** notice is given before a version or endpoint is removed.
2.  **OpenAPI Flag:** Mark the endpoint with `deprecated: true` in the controller.
3.  **Deprecation Headers:** Every response from a deprecated endpoint carries:
    - `Deprecated: true`
    - `Sunset: [Date]` (The scheduled EOL date in HTTP-date format).
    - `Link: <replacement-url>; rel="successor-version"`
4.  **Logging:** Backend logs should track the usage of deprecated endpoints to identify high-impact removals.

> [!TIP]
> This is implemented via the `@Deprecated()` decorator
> (`backend/src/common/decorators/deprecated.decorator.ts`) and the global
> `DeprecationInterceptor`
> (`backend/src/common/interceptors/deprecation.interceptor.ts`). Annotate a
> handler with `@Deprecated({ sunsetDate, replacementEndpoint,
> migrationGuideUrl })` to get the headers above plus a per-call warning log,
> and the route is automatically flagged `deprecated: true` in the OpenAPI
> spec.

---

## 6. Migration Procedures

1.  **Parallel Execution:** The new version (e.g., `v2`) is deployed alongside the old version (`v1`).
2.  **Shadow Testing:** High-traffic endpoints are "shadowed" to compare outputs between versions before full release.
3.  **Migration Guide:** Every major version increment must be accompanied by a dedicated migration guide in `backend/docs/api/migrations/v1-to-v2.md`.
4.  **Client Support:** The "Stable" and "Deprecated" versions are maintained concurrently until the Sunset date.

---

## 7. Version Communication

We communicate version changes through:

- **API-CHANGELOG.md:** The source of truth for all changes.
- **Developer Portal:** High-level announcements on the dashboard.
- **Email/Discord:** Bulletins sent to developers using affected keys.
- **OpenAPI spec:** Real-time updates at `/api/docs`.

---

## 8. Development Checklist

When introducing changes that affect versioning:

- [ ] Is this change backward compatible? If no, it **must** be tied to a new Major version.
- [ ] Have I updated `API-CHANGELOG.md`?
- [ ] For deprecations, is the `Sunset` header configured?
- [ ] Are all new properties documented with `@ApiProperty` examples?
- [ ] If introducing a new Major version, has the NestJS `VersioningType.URI` been updated?

---

## 9. Best Practices

1.  **Design for Extensibility:** Use objects instead of primitives in responses to allow for future fields.
2.  **Avoid Version Bloat:** Only increment major versions for truly breaking changes. Aggregate multiple breaking changes into a single milestone.
3.  **Client Robustness:** Educate clients to ignore unknown properties (Postel's Law).
4.  **Automated Testing:** Use Contract Testing (e.g., Pact) to ensure that updates don't inadvertently break existing client expectations.

---

## 10. Tools & Resources

- **OpenAPI/Swagger:** [Swagger UI](/api/docs)
- **Changelog:** [API-CHANGELOG.md](./API-CHANGELOG.md)
- **Standards:** [API-STANDARDS.md](./API-STANDARDS.md)
