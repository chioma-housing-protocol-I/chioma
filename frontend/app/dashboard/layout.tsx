'use client';

import React, { useState } from 'react';
import { Menu, Wallet, Bell, Search, User } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function TenantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 font-sans text-neutral-900 dark:text-neutral-100 flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <div className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Left Section - Mobile Toggle & Title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
                aria-label="Open sidebar"
              >
                <Menu size={24} />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-xl font-semibold tracking-tight">
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
                  className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-700 transition-all"
                />
              </div>
              <button className="md:hidden p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <Search size={20} />
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-neutral-900 rounded-full"></span>
              </button>

              {/* Connect Wallet Placeholder */}
              <button className="hidden sm:flex items-center justify-center space-x-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-full text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-sm">
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>

              {/* User Profile Avatar */}
              <button className="flex items-center justify-center w-10 h-10 bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue rounded-full hover:ring-2 hover:ring-brand-blue/50 transition-all">
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
