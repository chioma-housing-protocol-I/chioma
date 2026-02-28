'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import NotificationDropdown from './NotificationDropdown';

// ─── Props ──────────────────────────────────────────────────────────────────

interface NotificationBellProps {
  /** Route to the "View All" notifications page (role-dependent). */
  viewAllHref: string;
  /** Optional override for the icon size. */
  size?: number;
  /** Extra classes applied to the outer button. */
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationBell({
  viewAllHref,
  size = 20,
  className = '',
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const isLoaded = useNotificationStore((s) => s.isLoaded);
  const unreadCount = useNotificationStore(selectUnreadCount);

  // Hydrate store on first mount
  useEffect(() => {
    if (!isLoaded) fetchNotifications();
  }, [isLoaded, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative p-2 rounded-full transition-colors cursor-pointer hover:bg-gray-100 ${className}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={size} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          viewAllHref={viewAllHref}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
