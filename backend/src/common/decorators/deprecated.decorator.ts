import { SetMetadata } from '@nestjs/common';

export const DEPRECATION_KEY = 'api:deprecation';

export interface DeprecationOptions {
  /** ISO date (YYYY-MM-DD) after which the endpoint will be removed. */
  sunset: string;
  /** Optional link to the migration guide or successor endpoint. */
  link?: string;
}

/**
 * Marks an endpoint (or controller) as deprecated. The DeprecationInterceptor
 * adds `Deprecation`, `Sunset` and `Link` response headers (RFC 8594 / RFC 9745).
 * See docs/api-versioning-policy.md.
 */
export const Deprecated = (options: DeprecationOptions) =>
  SetMetadata(DEPRECATION_KEY, options);
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export const DEPRECATION_METADATA_KEY = 'deprecation:options';

export interface DeprecationOptions {
  /** When the endpoint is expected to stop working. Anything `Date` can parse. */
  sunsetDate?: string;
  /** URL to documentation describing how to migrate away from this endpoint. */
  migrationGuideUrl?: string;
  /** Path (or description) of the endpoint that replaces this one. */
  replacementEndpoint?: string;
  /** Note logged alongside each deprecated call. Not exposed to clients. */
  message?: string;
}

/**
 * Marks a controller method (or an entire controller) as deprecated.
 *
 * Combined with DeprecationInterceptor, this surfaces standard `Deprecation`,
 * `Sunset` (RFC 8594) and `Link` response headers to callers, logs a warning
 * per call, and flags the route as deprecated in the generated Swagger docs.
 *
 * Usage:
 * @Get('legacy-endpoint')
 * @Deprecated({
 *   sunsetDate: '2026-12-31T00:00:00Z',
 *   migrationGuideUrl: 'https://docs.example.com/migrate-to-v2',
 *   replacementEndpoint: '/api/v2/widgets',
 * })
 * async handler() { ... }
 */
export function Deprecated(options: DeprecationOptions = {}) {
  return applyDecorators(
    SetMetadata(DEPRECATION_METADATA_KEY, options),
    ApiOperation({ deprecated: true }),
  );
}
