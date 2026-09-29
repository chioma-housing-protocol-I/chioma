# API Versioning & Deprecation Policy

## Strategy

The backend uses NestJS **URI versioning** (`backend/src/main.ts`): routes are served as `/v{N}/...`, with `defaultVersion: '1'`.

## When a new version is introduced

A new major version (`v2`, `v3`, ...) is required only for **breaking changes**:

- Removing or renaming an endpoint, field, or query parameter
- Changing a field's type, format, or semantics
- Making an optional request field required
- Changing authentication/authorization requirements or error codes clients rely on

Non-breaking changes (new endpoints, new optional fields, new response fields) ship in the current version.

## Support window

- The previous major version is supported for **at least 6 months** after the new version is released.
- Security fixes are backported during the support window; new features are not.
- Individual deprecated endpoints within a version get a minimum **90-day** notice before removal.

## Client notification

1. Changelog entry and release notes announcing the deprecation and sunset date.
2. Email/notice to registered API consumers at deprecation, 30 days before, and 7 days before sunset.
3. Response headers on every call to a deprecated endpoint (see below).
4. Swagger docs mark the operation as deprecated (`@ApiOperation({ deprecated: true })`).

## Deprecation headers

Mark an endpoint or controller with `@Deprecated()`; the global `DeprecationInterceptor` adds the headers:

```ts
import { Deprecated } from '../common/decorators/deprecated.decorator';

@Get('legacy')
@Deprecated({ sunset: '2027-03-31', link: 'https://docs.chioma.app/migrations/v2' })
@ApiOperation({ summary: 'Legacy endpoint', deprecated: true })
legacy() { ... }
```

Response:

```
Deprecation: true
Sunset: Wed, 31 Mar 2027 00:00:00 GMT
Link: <https://docs.chioma.app/migrations/v2>; rel="deprecation"
```

(`Sunset` per RFC 8594, `Deprecation` per RFC 9745.)

## Removal

After the sunset date the endpoint returns `410 Gone` for one release, then is removed.
