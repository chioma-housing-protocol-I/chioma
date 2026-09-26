import {
  getDashboardRoute,
  type UserRole,
} from '@/lib/navigation/role-navigation';

export const AUTH_COOKIE_NAME = 'chioma_auth_token';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

/** Decode the JWT access-token payload for routing decisions (API still validates). */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const [, payloadSegment] = token.split('.');
    if (!payloadSegment) return null;

    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as AccessTokenPayload;

    if (payload.type !== 'access' || !payload.role) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function normalizeRole(role: string): UserRole | null {
  const normalized = role.toLowerCase();

  if (
    normalized === 'admin' ||
    normalized === 'super_admin' ||
    normalized === 'user' ||
    normalized === 'agent'
  ) {
    return normalized;
  }

  return null;
}

/** Route prefixes and the roles permitted to access them. */
export const ROUTE_ROLE_REQUIREMENTS: Array<{
  prefix: string;
  allowedRoles: UserRole[];
}> = [
  { prefix: '/admin', allowedRoles: ['admin', 'super_admin'] },
  {
    prefix: '/user',
    allowedRoles: ['user', 'agent', 'admin', 'super_admin'],
  },
];

export function getRequiredRoles(pathname: string): UserRole[] | null {
  const rule = ROUTE_ROLE_REQUIREMENTS.find((entry) =>
    pathname.startsWith(entry.prefix),
  );
  return rule?.allowedRoles ?? null;
}

export function getRoleRedirectUrl(role: UserRole, requestUrl: string): string {
  return new URL(getDashboardRoute(role), requestUrl).toString();
}
