'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Terminal } from 'lucide-react';
import { navItems } from '@/types/sidebar-items';
import Logo from '@/components/Logo';
import { useAuth } from '@/store/authStore';

interface DeveloperSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: navItems[];
}

export const DeveloperSidebar = ({
  isOpen,
  onClose,
  navItems,
}: DeveloperSidebarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/developer') return pathname === '/developer';
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 start-0 bottom-0 w-64 z-50 flex flex-col
          bg-slate-900/70 backdrop-blur-2xl border-e border-white/10
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}`}
      >
        {/* Logo + Portal Badge */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/10 flex-shrink-0">
          <Logo size="sm" showText={true} />
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-semibold tracking-wider uppercase">
            <Terminal size={10} />
            Dev
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                id={`dev-nav-${item.name.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and')}`}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${
                    active
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shadow-lg shadow-indigo-900/20'
                      : 'text-blue-200/60 hover:bg-white/5 hover:text-blue-100 border border-transparent'
                  }`}
              >
                <Icon
                  size={18}
                  className={
                    active
                      ? 'text-indigo-400'
                      : 'text-blue-300/50 group-hover:text-blue-300 transition-colors'
                  }
                />
                <span>{item.name}</span>
                {active && (
                  <span className="ms-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-white/10 space-y-2 flex-shrink-0">
          {user && (
            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-blue-300/50 font-medium uppercase tracking-wider mb-0.5">
                Signed in as
              </p>
              <p className="text-sm text-white font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-start
              text-blue-200/60 hover:bg-red-500/10 hover:text-red-400
              transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
