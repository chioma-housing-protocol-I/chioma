'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/store/authStore';
import type { SidebarProps } from './types';

/**
 * Unified Sidebar component for all user types
 * Supports responsive design: hidden on mobile, collapsed on tablet, full on desktop
 */
export function Sidebar({
  navItems,
  isOpen = false,
  onClose,
  userRole,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  // Filter nav items based on visibility rules
  const visibleItems = navItems.filter((item) => {
    if (!item.visibleFor) return true;
    return item.visibleFor.includes(userRole || (user?.role as any) || 'user');
  });

  const isActive = (href: string) => {
    if (href === '/user') return pathname === '/user';
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
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
        className={`fixed top-0 start-0 bottom-0 w-64 backdrop-blur-xl bg-slate-900/50 border-e border-white/10 z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0'
            : 'ltr:-translate-x-full rtl:translate-x-full'
        } flex flex-col ${className}`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Logo size="sm" />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-white/10 text-white shadow-lg border border-white/10'
                    : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    size={20}
                    className={active ? 'text-blue-400' : 'text-blue-300/60'}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="ms-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Area */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-start text-blue-200/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
