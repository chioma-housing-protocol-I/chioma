'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Wrench,
  FileText,
  Settings,
  Search,
  Menu,
  X,
  Plus,
  LogOut,
  BellRing,
  Home,
} from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import Logo from '@/components/Logo';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Properties',
      href: '/dashboard/properties',
      icon: Building2,
      badge: '●',
    },
    {
      name: 'Tenants',
      href: '/dashboard/tenants',
      icon: Users,
    },
    {
      name: 'Financials',
      href: '/dashboard/financials',
      icon: Wallet,
    },
    {
      name: 'Maintenance',
      href: '/dashboard/maintenance',
      icon: Wrench,
    },
    {
      name: 'Documents',
      href: '/dashboard/documents',
      icon: FileText,
    },
    {
      name: 'Notifications',
      href: '/dashboard/notifications',
      icon: BellRing,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Logo
            size="sm"
            textClassName="text-base font-semibold tracking-tight bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent"
          />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-blue-200/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile - Bottom of Sidebar */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white/20">
              JO
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">
                James Obi
              </div>
              <div className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
                Premium Plan
              </div>
            </div>
            <button className="text-blue-300/40 group-hover:text-blue-300 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
          <div className="h-16 sm:h-20 px-4 sm:px-6 flex items-center justify-between">
            {/* Left Section - Mobile Menu + Title */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 text-blue-200 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Page Title */}
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Dashboard Overview
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:flex relative w-64 lg:w-80 group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search properties, tenants..."
                  className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-blue-300/30 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Home Link */}
              <Link
                href="/"
                className="text-blue-200/60 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"
                title="Go to Home Page"
              >
                <Home size={22} />
              </Link>

              {/* Notifications */}
              <NotificationBell
                viewAllHref="/dashboard/notifications"
                size={22}
                className="text-blue-200/60 hover:text-white"
              />

              {/* Add Property Button */}
              <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20">
                <Plus size={18} />
                <span className="hidden sm:inline">Add Property</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </div>
  );
};

export default DashboardLayout;
