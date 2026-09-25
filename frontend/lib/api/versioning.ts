export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

const DEFAULT_VERSION: ApiVersion = API_VERSIONS.V1;

/** Returns the API version from the environment, falling back to v1. */
export function getConfiguredVersion(): ApiVersion {
  if (typeof process !== 'undefined') {
    const env = process.env.NEXT_PUBLIC_API_VERSION;
    if (env === API_VERSIONS.V1 || env === API_VERSIONS.V2) return env;
  }
  return DEFAULT_VERSION;
}

/**
 * Prefixes an endpoint with the given API version.
 * Skips prefixing when the endpoint is already versioned.
 */
export function versionedPath(
  endpoint: string,
  version: ApiVersion = getConfiguredVersion(),
): string {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  for (const v of Object.values(API_VERSIONS)) {
    if (clean === `/${v}` || clean.startsWith(`/${v}/`)) return clean;
  }
  return `/${version}${clean}`;
}

/**
 * Reads the negotiated API version from server response headers.
 * Returns null when no recognisable version header is present.
 */
export function negotiateVersion(headers: Headers): ApiVersion | null {
  const raw =
    headers.get('api-version') ?? headers.get('x-api-version') ?? null;
  if (raw === API_VERSIONS.V1 || raw === API_VERSIONS.V2) return raw;
  return null;
}

/**
 * Returns true when an endpoint is considered deprecated for the given version.
 * Extend this map as the backend evolves.
 */
export function isDeprecated(_endpoint: string, _version: ApiVersion): boolean {
  return false;
}

/**
 * Executes `primaryFn` and falls back to `fallbackFn` when the primary call
 * returns a 404 (gone) or 410 (deprecated) response.
 */
export async function withVersionFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
): Promise<T> {
  try {
    return await primaryFn();
  } catch (error) {
    if (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      (error.status === 404 || error.status === 410)
    ) {
      return fallbackFn();
    }
    throw error;
  }
}
