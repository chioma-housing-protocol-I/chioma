import { Header } from '@nestjs/common';

/**
 * Sets a `Cache-Control` response header (#2053). Thin wrapper over
 * NestJS's `@Header()` so call sites read as intent ("cache this
 * publicly for 60s") rather than a raw header string, and so the few
 * directives this app actually uses stay consistent across endpoints.
 *
 * - `CacheControl.public(maxAgeSeconds)` — safe for shared/CDN caches;
 *   use only on responses that do not vary per authenticated user.
 * - `CacheControl.private(maxAgeSeconds)` — cacheable by the requesting
 *   browser only, never a shared cache; use for per-user GET responses
 *   that are still safe to cache locally (e.g. "my properties").
 * - `CacheControl.noStore()` — must not be cached anywhere, including
 *   by the browser; use for anything mutating or carrying data that
 *   must always be re-fetched fresh (payments, auth, writes).
 */
export const CacheControl = {
  public: (maxAgeSeconds: number) =>
    Header('Cache-Control', `public, max-age=${maxAgeSeconds}`),
  private: (maxAgeSeconds: number) =>
    Header('Cache-Control', `private, max-age=${maxAgeSeconds}`),
  noStore: () => Header('Cache-Control', 'no-store'),
};
