'use client';

import React, { useEffect, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute — Client-side auth guard component.
 *
 * Wraps dashboard content and redirects unauthenticated users to /login.
 * Works as a second layer of protection alongside the Next.js middleware.
 *
 * Usage:
 *   <ProtectedRoute>
 *     <DashboardContent />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Show a loading skeleton while auth state is being hydrated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-200/60 font-medium">
            Verifying authentication…
          </p>
        </div>
      </div>
    );
  }

  // Don't render children until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
