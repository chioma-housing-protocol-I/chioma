'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Wrench,
  FileText,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  LogOut,
} from 'lucide-react';

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
    <div className="min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-neutral-200 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-neutral-200">
          <Link
            href="/"
            className="flex items-center space-x-2 text-brand-blue"
          >
            <span className="text-2xl font-bold">Chioma</span>
          </Link>
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
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-blue text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !active && (
                  <span className="text-orange-500 text-xs">●</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile - Bottom of Sidebar */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-neutral-100 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              JO
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900 truncate">
                James Obi
              </div>
              <div className="text-xs text-neutral-500">Premium Plan</div>
            </div>
            <button className="text-neutral-400 hover:text-neutral-600">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
          <div className="h-20 px-6 flex items-center justify-between">
            {/* Left Section - Mobile Menu + Title */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Page Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">
                Dashboard Overview
              </h1>
            </div>

            {/* Right Section - Search + Actions */}
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="hidden md:flex relative w-64 lg:w-80">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search properties, tenants..."
                  className="w-full pl-12 pr-4 py-2.5 bg-neutral-100 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-brand-blue transition-colors"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
                <Bell size={22} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Add Property Button */}
              <button className="flex items-center space-x-2 bg-brand-blue text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-blue-dark transition-colors shadow-lg shadow-brand-blue/20">
                <Plus size={18} />
                <span className="hidden sm:inline">Add Property</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">{children}</main>
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
