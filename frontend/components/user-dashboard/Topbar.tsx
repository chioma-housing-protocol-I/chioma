'use client';

import { Menu, Search, Bell, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/store/authStore';
import type { TopbarProps } from './types';

/**
 * Unified Topbar component for all user types
 * Displays page title, search, notifications, and user menu
 */
export function Topbar({
  pageTitle = 'Dashboard',
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  className = '',
}: TopbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { user } = useAuth();

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl bg-slate-900/50 border-b border-white/10 ${className}`}
    >
      <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-4 flex-1">
          <button className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Menu size={20} className="text-blue-300" />
          </button>
          <h1 className="text-xl font-bold text-white hidden sm:block">
            {pageTitle}
          </h1>
        </div>

        {/* Center: Search */}
        {showSearch && (
          <div
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isSearchFocused
                ? 'bg-white/10 border border-blue-400/50'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <Search size={18} className="text-blue-300/60" />
            <input
              type="text"
              placeholder="Search..."
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="bg-transparent outline-none text-sm text-white placeholder-blue-200/40 w-48"
            />
          </div>
        )}

        {/* Right: Notifications + User Menu */}
        <div className="flex items-center gap-3">
          {showNotifications && (
            <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Bell size={20} className="text-blue-300" />
              <span className="absolute top-1 end-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>
          )}

          {showUserMenu && (
            <button className="p-1 hover:bg-white/10 rounded-lg transition-colors overflow-hidden border border-white/10">
              {user?.avatar ? (
                <div className="relative h-8 w-8">
                  <Image
                    src={user.avatar}
                    alt="User Profile"
                    fill
                    className="object-cover rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="p-1">
                  <UserIcon size={20} className="text-blue-300" />
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
