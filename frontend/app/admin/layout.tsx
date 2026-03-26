'use client';

import AdminSidebar from '@/components/admin-dashboard/Sidebar';
import AdminTopbar from '@/components/admin-dashboard/Topbar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const pageTitleMap: Record<string, string> = {
    '/admin/audit-logs': 'Audit Logs',
  };

  const pageTitle = pageTitleMap[pathname] ?? 'Admin';

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminTopbar pageTitle={pageTitle} />
          <ClientErrorBoundary
            source="app/admin/layout.tsx-main"
            fallbackTitle="Admin panel failed"
            fallbackDescription="This admin panel encountered an error. Retry to continue."
          >
            <main className="p-4 sm:p-6 overflow-auto flex-1">{children}</main>
          </ClientErrorBoundary>
        </div>
      </div>
    </ProtectedRoute>
  );
}
