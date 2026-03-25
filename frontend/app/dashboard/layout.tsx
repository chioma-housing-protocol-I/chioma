'use client';

import React, { useState } from 'react';
import { Menu, Wallet, Search, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { dashboardNavItems } from '@/data/dashboard-nav-items';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 font-sans text-white flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navItems={dashboardNavItems}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Left Section - Mobile Toggle & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -ml-2 text-blue-200 hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Open sidebar"
              >
                <Menu size={24} />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Tenant Portal
                </h1>
              </div>
            </div>

            {/* Right Section - Search, Wallet, Profile */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Search Icon (Mobile) or Bar (Desktop) */}
              <div className="hidden md:flex relative w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <button className="md:hidden p-2 text-blue-200 hover:bg-white/10 rounded-full transition-colors">
                <Search size={20} />
              </button>

              {/* Notifications */}
              <NotificationBell
                viewAllHref="/dashboard/notifications"
                size={20}
                className="text-blue-200"
              />

              {/* Connect Wallet Placeholder */}
              <button className="hidden sm:flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl">
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>

              {/* User Profile Avatar */}
              <button className="flex items-center justify-center w-10 h-10 bg-white/10 text-blue-300 rounded-full hover:bg-white/20 transition-all border border-white/20">
                <User size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <ClientErrorBoundary
          source="app/dashboard/layout.tsx-main"
          fallbackTitle="Dashboard content crashed"
          fallbackDescription="We could not render this dashboard view. Retry to continue."
        >
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
            {children}
          </main>
        </ClientErrorBoundary>
      </div>
    </div>
  );
}
