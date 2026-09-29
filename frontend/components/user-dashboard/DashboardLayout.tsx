'use client';

import { useState } from 'react';
import type { DashboardLayoutProps } from './types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Main dashboard layout wrapper
 * Provides responsive layout with sidebar and topbar
 */
export function DashboardLayout({
  children,
  sidebar,
  topbar,
  className = '',
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className={`flex h-dvh bg-slate-950 ${className} transition-orientation`}
    >
      {/* Sidebar */}
      {sidebar || (
        <Sidebar
          navItems={[]}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        {topbar || <Topbar />}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
