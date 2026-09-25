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
