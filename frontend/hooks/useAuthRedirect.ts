import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import { getDashboardRoute } from '@/lib/navigation/role-navigation';

/**
 * Hook to redirect authenticated users to their role-based dashboard
 * Useful on landing page to prevent authenticated users from seeing the login flow
 *
 * Wallet-only accounts (no email yet) go to the dashboard like everyone else;
 * WalletEmailBanner asks for the email once they are there.
 */
export function useAuthRedirect() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;
    if (!isAuthenticated || !user) return;

    const userRole = (user.role as string)?.toLowerCase() as UserRole;
    router.push(getDashboardRoute(userRole));
  }, [user, isAuthenticated, loading, router]);

  return { user, isAuthenticated, loading };
}
