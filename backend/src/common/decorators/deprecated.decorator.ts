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
