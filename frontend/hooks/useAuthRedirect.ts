import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { getDashboardRoute } from '@/lib/navigation/role-navigation';

/**
 * Hook to redirect authenticated users to their role-based dashboard
 * Useful on landing page to prevent authenticated users from seeing the login flow
 */
export function useAuthRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      console.log('⏳ Auth still loading...');
      return;
    }

    // If user is authenticated, redirect to their dashboard
    if (isAuthenticated && user) {
      const userRole = (user.role as string).toLowerCase();
      const dashboardRoute = getDashboardRoute(userRole as any);

      console.log('🚀 User authenticated, redirecting to dashboard:', {
        userRole,
        dashboardRoute,
      });

      router.push(dashboardRoute);
    }
  }, [user, isAuthenticated, loading, router]);

  return { user, isAuthenticated, loading };
}
