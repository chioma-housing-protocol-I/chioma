'use client';

import { useState } from 'react';
import { FaSearch, FaBars, FaTimes, FaHome } from 'react-icons/fa';
import { NotificationBell } from '@/components/notifications';
import Link from 'next/link';
import Image from 'next/image';
import { FaArrowRightFromBracket } from 'react-icons/fa6';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import { useAuth } from '@/store/authStore';
import { getAdminNavItems } from './navigation';

export default function AdminTopbar({ pageTitle }: { pageTitle: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getAdminNavItems(user?.role);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <>
      <header className="flex items-center justify-between px-3 py-2 md:p-4 backdrop-blur-xl bg-slate-900/80 border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 text-white -ml-1 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <FaBars className="text-lg" />
          </button>

          <h1 className="text-base md:text-2xl font-bold text-white tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="hidden md:flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-full w-1/3 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <FaSearch className="text-blue-300/40" />
          <input
            type="text"
            placeholder={`Search ${pageTitle.toLowerCase()}...`}
            className="mx-3 w-full bg-transparent outline-none text-white text-sm placeholder:text-blue-300/30"
          />
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 text-blue-200 transition-colors"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
          >
            <FaSearch size={18} />
          </button>

          <Link
            href="/"
            className="text-blue-200 hover:text-white transition-colors"
            title="Go to Home Page"
          >
            <FaHome size={22} />
          </Link>

          <NotificationBell
            viewAllHref="/settings"
            size={20}
            className="text-blue-200"
          />
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300
          ${searchOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}
        `}
      >
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity
            ${searchOpen ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={() => setSearchOpen(false)}
        />

        <div
          className={`relative bg-slate-900 border-b border-white/10 p-4 shadow-2xl transform transition-transform duration-300
            ${searchOpen ? 'translate-y-0' : '-translate-y-full'}
          `}
        >
          <div className="flex items-center gap-3">
            <FaSearch className="text-blue-300/40" />
            <input
              autoFocus
              type="text"
              placeholder={`Search ${pageTitle.toLowerCase()}...`}
              className="w-full outline-none bg-transparent text-white text-sm placeholder:text-blue-300/30"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300
          ${mobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}
        `}
      >
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity
            ${mobileOpen ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={() => setMobileOpen(false)}
        />

        <aside
          className={`relative flex flex-col justify-between h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl
            transform transition-transform duration-300
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            w-64
          `}
        >
          <div>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <Logo
                size="sm"
                textClassName="text-xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent"
              />
              <button
                onClick={() => setMobileOpen(false)}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? 'bg-white/10 text-white font-semibold border border-white/10 shadow-lg'
                          : 'hover:bg-white/5 text-blue-200/70 hover:text-white'
                      }
                    `}
                  >
                    <item.icon
                      className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-blue-300/60'}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {navItems.length === 0 && (
                <p className="px-4 py-3 text-sm text-blue-200/60">
                  No admin pages available for your role.
                </p>
              )}
            </nav>
          </div>

          <div className="p-4 border-t border-white/10">
            <button className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all w-full text-left">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/20">
                <Image
                  src="/avatar.png"
                  alt="User Avatar"
                  width={100}
                  height={100}
                  sizes="40px"
                  className="rounded-full"
                />
              </div>

              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-semibold text-white truncate w-full">
                  {fullName || user?.email || 'Admin User'}
                </span>
                <span className="text-xs text-blue-300/60 capitalize">
                  {user?.role || 'admin'}
                </span>
              </div>

              <FaArrowRightFromBracket className="ml-auto h-5 w-5 text-blue-300/40 group-hover:text-blue-300" />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
