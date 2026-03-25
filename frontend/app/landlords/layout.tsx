'use client';

import Sidebar from '../../components/landlord-dashboard/Sidebar';
import Topbar from '../../components/landlord-dashboard/Topbar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const pageTitleMap: Record<string, string> = {
    '/landlords': 'Dashboard Overview',
    '/landlords/properties': 'Properties',
    '/landlords/properties/add': 'Add New Property',
    '/landlords/tenants': 'Tenants',
    '/landlords/financials': 'Financials',
    '/landlords/maintenance': 'Maintenance',
    '/landlords/documents': 'Documents',
    '/landlords/settings': 'Settings',
    '/landlords/notifications': 'Notifications',
    '/landlords/disputes': 'Disputes',
    '/landlords/reviews': 'Reviews',
  };

  const pageTitle = pageTitleMap[pathname] ?? 'Dashboard';

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar pageTitle={pageTitle} />
          <ClientErrorBoundary
            source="app/landlords/layout.tsx-main"
            fallbackTitle="Dashboard panel failed"
            fallbackDescription="This dashboard panel encountered an error. Retry to continue."
          >
            <main className="p-4 sm:p-6 overflow-auto flex-1">{children}</main>
          </ClientErrorBoundary>
        </div>
      </div>
    </ProtectedRoute>
  );
}
