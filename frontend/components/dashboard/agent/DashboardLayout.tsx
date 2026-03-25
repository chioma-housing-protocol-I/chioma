'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  House,
  Building2,
  Wallet,
  MessageSquare,
  FileText,
  PieChart,
  BellRing,
  Search,
  Plus,
  LogOut,
  Menu,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/agent',
      icon: House,
    },
    {
      name: 'Properties',
      href: '/agents/properties',
      icon: Building2,
    },
    {
      name: 'My Wallet',
      href: '/agents/wallet',
      icon: Wallet,
    },
    {
      name: 'Messages',
      href: '/agents/messages',
      icon: MessageSquare,
      badge: '3',
      badgeColor: 'bg-blue-600',
    },
    {
      name: 'Contracts',
      href: '/agents/contracts',
      icon: FileText,
    },
    {
      name: 'Analytics',
      href: '/agents/analytics',
      icon: PieChart,
    },
    {
      name: 'Notifications',
      href: '/agents/notifications',
      icon: BellRing,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/agent') return pathname === '/agent';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex transition-all duration-300">
      {/* Sidebar Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-20 sm:h-24 flex items-center px-4 sm:px-8 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              C
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent tracking-tight">
              Chioma
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  active
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-blue-200/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={`transition-colors duration-200 ${
                      active
                        ? 'text-blue-400'
                        : 'text-blue-200/40 group-hover:text-blue-300'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active Indicator Left Glow */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 mx-4 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden relative shrink-0 shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                alt="Sarah Jenks profile avatar"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-bold truncate">
                Sarah Jenks
              </div>
              <div className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest mt-1">
                Agent ID: #8839
              </div>

              <button
                type="button"
                className="flex items-center gap-2 text-[10px] font-bold text-blue-300/40 hover:text-white transition-all uppercase tracking-widest mt-4 group"
              >
                <LogOut
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 min-h-16 sm:min-h-20 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-blue-200/60 font-medium">
              Welcome back, Sarah
            </p>
          </div>

          <div className="flex-1 flex items-center justify-end gap-6">
            {/* Search */}
            <div className="hidden md:flex items-center relative w-96 group">
              <Search
                size={16}
                className="absolute left-4 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
              />
              <input
                type="text"
                placeholder="Search properties, clients..."
                className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-blue-300/30 outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Home Link */}
            <Link
              href="/"
              className="text-blue-200/60 hover:text-white transition-all p-2 hover:bg-white/5 rounded-xl"
              title="Go to Home Page"
            >
              <House size={20} />
            </Link>

            {/* Notification */}
            <NotificationBell
              viewAllHref="/agents/notifications"
              size={20}
              className="text-blue-200/60 hover:text-white"
            />

            {/* CTA */}
            <button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20">
              <Plus size={18} />
              <span>Create New Listing</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
