'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import AdminBreadcrumbs from '@/components/admin-dashboard/AdminBreadcrumbs';
import AdminSidebar from '@/components/admin-dashboard/Sidebar';
import AdminTopbar from '@/components/admin-dashboard/Topbar';
import { getAdminPageTitle } from '@/components/admin-dashboard/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';
import { useAuth } from '@/store/authStore';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const pageTitle = getAdminPageTitle(pathname);
  const canAccessAdmin = ['admin', 'support', 'auditor'].includes(
    user?.role ?? '',
  );

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminTopbar pageTitle={pageTitle} />
          <AdminBreadcrumbs pathname={pathname} />
          <ClientErrorBoundary
            source="app/admin/layout.tsx-main"
            fallbackTitle="Admin panel failed"
            fallbackDescription="This admin panel encountered an error. Retry to continue."
          >
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              {!canAccessAdmin ? (
                <section className="mx-auto max-w-2xl rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 sm:p-8">
                  <h2 className="text-2xl font-bold text-amber-100">
                    Access restricted
                  </h2>
                  <p className="mt-3 text-sm text-amber-100/85 sm:text-base">
                    Your account does not currently have permission to view
                    admin pages. Contact an administrator if you need access.
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
                  >
                    Go to homepage
                  </Link>
                </section>
              ) : (
                children
              )}
            </main>
          </ClientErrorBoundary>
        </div>
      </div>
    </ProtectedRoute>
  );
}
