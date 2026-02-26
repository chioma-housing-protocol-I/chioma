'use client';

import React, { useState } from 'react';
import { Menu, Wallet, Search, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200">
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Left Section - Mobile Toggle & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                aria-label="Open sidebar"
              >
                <Menu size={24} />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
                  Tenant Portal
                </h1>
              </div>
            </div>

            {/* Right Section - Search, Wallet, Profile */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Search Icon (Mobile) or Bar (Desktop) */}
              <div className="hidden md:flex relative w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
                />
              </div>
              <button className="md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors">
                <Search size={20} />
              </button>

              {/* Notifications */}
              <NotificationBell
                viewAllHref="/dashboard/notifications"
                size={20}
                className="text-neutral-600"
              />

              {/* Connect Wallet Placeholder */}
              <button className="hidden sm:flex items-center justify-center space-x-2 bg-blue-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm">
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>

              {/* User Profile Avatar */}
              <button className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-full hover:ring-2 hover:ring-blue-100 transition-all border border-blue-100">
                <User size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
