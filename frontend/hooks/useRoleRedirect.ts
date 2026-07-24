import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import {
  getDashboardRoute,
  type UserRole,
} from '@/lib/navigation/role-navigation';

/**
 * Hook to redirect users to their role-based dashboard if they're on the wrong page
 * @param allowedRoles - Array of roles allowed to access the current page
 * @param redirectIfNotAuth - Whether to redirect to home if not authenticated (default: true)
 */
export function useRoleRedirect(
  allowedRoles?: UserRole[],
  redirectIfNotAuth: boolean = true,
) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && redirectIfNotAuth) {
      router.push('/login');
      return;
    }

    if (allowedRoles && user) {
      const userRole = (user.role as string).toLowerCase() as UserRole;
      const normalizedAllowedRoles = allowedRoles.map(
        (r) => r.toLowerCase() as UserRole,
      );

      if (!normalizedAllowedRoles.includes(userRole)) {
        const correctDashboard = getDashboardRoute(userRole);
        router.push(correctDashboard);
      }
    }
  }, [user, isAuthenticated, loading, allowedRoles, redirectIfNotAuth, router]);

  return { user, isAuthenticated, loading };
}
