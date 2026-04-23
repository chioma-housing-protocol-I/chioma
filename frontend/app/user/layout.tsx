'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Menu, Wallet, Search, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { Sidebar } from '@/components/user-dashboard';
import { userNavItems } from '@/data/user-nav-items';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';
import { useAuth } from '@/store/authStore';

const WalletConnectButton = dynamic(
  () => import('@/components/auth/WalletConnectButton'),
  { ssr: false },
);

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { walletAddress } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 font-sans text-white flex flex-col lg:flex-row">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navItems={userNavItems}
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
                  User Dashboard
                </h1>
              </div>
            </div>

            {/* Right Section - Search, Wallet, Profile */}
            <div className="flex items-center space-x-3 sm:space-x-4">
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

              <a
                href="/user/properties/wizard"
                className="hidden sm:flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Add new listing
              </a>
              <NotificationBell
                viewAllHref="/user/notifications"
                size={20}
                className="text-blue-200"
              />
              {walletAddress ? (
                <div className="px-4 py-2.5 rounded-lg bg-green-500/20 border border-green-500/50 backdrop-blur-sm">
                  <p className="text-sm text-green-200 font-mono">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
                  </p>
                </div>
              ) : (
                <WalletConnectButton
                  className="px-6 py-2.5 text-sm"
                  buttonText="Connect Wallet"
                />
              )}

              <button className="flex items-center justify-center w-10 h-10 bg-white/10 text-blue-300 rounded-full hover:bg-white/20 transition-all border border-white/20">
                <User size={18} />
              </button>
            </div>
          </div>
        </header>

        <ClientErrorBoundary
          source="app/user/layout.tsx-main"
          fallbackTitle="User content failed"
          fallbackDescription="This user section encountered an issue. Retry to restore it."
        >
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
            {children}
          </main>
        </ClientErrorBoundary>
      </div>
    </div>
  );
}
