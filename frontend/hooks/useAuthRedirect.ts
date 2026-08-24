import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { getDashboardRoute } from '@/lib/navigation/role-navigation';

/**
 * Redirect authenticated users away from public entry pages (e.g. landing)
 * to their role-based dashboard. Navigation ergonomics only — protected
 * routes are gated server-side in proxy.ts.
 */
export function useAuthRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;

    const userRole = (user.role as string).toLowerCase();
    router.replace(getDashboardRoute(userRole as Parameters<typeof getDashboardRoute>[0]));
  }, [user, isAuthenticated, loading, router]);

  return { user, isAuthenticated, loading };
}
