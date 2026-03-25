'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { navItems } from '@/types/sidebar-items';
import Logo from '@/components/Logo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: navItems[];
}

export const Sidebar = ({ isOpen, onClose, navItems }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/tenant') return pathname === '/tenant';
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
        className={`fixed top-0 left-0 bottom-0 w-64 backdrop-blur-xl bg-slate-900/50 border-r border-white/10 z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <Logo size="sm" />
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
              </Link>
            );
          })}
        </nav>

        {/* User Profile / Logout Area */}
        <div className="p-4 border-t border-white/10">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-xl w-full text-left text-blue-200/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200">
            <LogOut size={20} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
