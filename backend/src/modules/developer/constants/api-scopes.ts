/**
 * Canonical vocabulary of API key scopes.
 *
 * Every scope granted to a key must come from this list, and endpoints opt in
 * to enforcement with the `@RequireApiScopes()` decorator. A key with no
 * scopes can only reach endpoints that do not declare required scopes.
 */
export const API_SCOPES = [
  'properties:read',
  'properties:write',
  'bookings:read',
  'bookings:write',
  'payments:read',
  'analytics:read',
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/**
 * Return the subset of `scopes` that are not part of the canonical vocabulary.
 */
export function findUnknownScopes(scopes: string[]): string[] {
  const known = new Set<string>(API_SCOPES);
  return scopes.filter((scope) => !known.has(scope));
}
