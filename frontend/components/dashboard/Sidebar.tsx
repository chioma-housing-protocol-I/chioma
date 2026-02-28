'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Settings,
  LogOut,
  BellRing,
  User,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Agreements',
    href: '/dashboard/documents',
    icon: FileText,
  },
  {
    name: 'Payments',
    href: '/dashboard/payments',
    icon: Wallet,
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: BellRing,
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-neutral-200 z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-neutral-100">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-blue-900 tracking-tight">
              Chioma
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    size={20}
                    className={active ? 'text-blue-600' : 'text-neutral-500'}
                  />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Profile / Logout Area */}
        <div className="p-4 border-t border-neutral-100">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200">
            <LogOut size={20} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
