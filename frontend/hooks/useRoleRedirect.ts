import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import {
  getDashboardRoute,
  type UserRole,
} from '@/lib/navigation/role-navigation';

/**
 * Client-side navigation helper for role-based dashboard routing.
 *
 * Authorization is enforced server-side in proxy.ts before pages render.
 * This hook only redirects authenticated users who land on the wrong
 * dashboard section during client-side navigation.
 */
export function useRoleRedirect(allowedRoles?: UserRole[]) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || !isAuthenticated || !user || !allowedRoles?.length) {
      return;
    }

    const userRole = (user.role as string).toLowerCase() as UserRole;
    const normalizedAllowedRoles = allowedRoles.map(
      (r) => r.toLowerCase() as UserRole,
    );

    if (!normalizedAllowedRoles.includes(userRole)) {
      router.replace(getDashboardRoute(userRole));
    }
  }, [user, isAuthenticated, loading, allowedRoles, router]);

  return { user, isAuthenticated, loading };
}
