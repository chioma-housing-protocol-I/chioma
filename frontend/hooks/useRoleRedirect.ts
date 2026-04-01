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
    // Wait for auth to load
    if (loading) {
      console.log('⏳ Auth still loading...');
      return;
    }

    console.log('📋 useRoleRedirect check:', {
      isAuthenticated,
      userRole: user?.role,
      allowedRoles,
      loading,
    });

    // Redirect to home if not authenticated and redirectIfNotAuth is true
    if (!isAuthenticated && redirectIfNotAuth) {
      console.log('❌ Not authenticated, redirecting to home');
      router.push('/');
      return;
    }

    // If allowedRoles is specified, check if user's role is allowed
    if (allowedRoles && user) {
      // Normalize role to lowercase for comparison
      const userRole = (user.role as string).toLowerCase() as UserRole;
      const normalizedAllowedRoles = allowedRoles.map(
        (r) => r.toLowerCase() as UserRole,
      );

      console.log('🔍 Role check:', {
        userRole,
        normalizedAllowedRoles,
        isAllowed: normalizedAllowedRoles.includes(userRole),
      });

      if (!normalizedAllowedRoles.includes(userRole)) {
        // Redirect to user's appropriate dashboard
        const correctDashboard = getDashboardRoute(userRole);
        console.log('⚠️ Role mismatch! Redirecting to:', correctDashboard);
        router.push(correctDashboard);
      } else {
        console.log('✅ Role allowed, rendering page');
      }
    }
  }, [user, isAuthenticated, loading, allowedRoles, redirectIfNotAuth, router]);

  return { user, isAuthenticated, loading };
}
