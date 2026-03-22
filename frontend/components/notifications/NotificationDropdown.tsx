'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import NotificationItem from './NotificationItem';

// ─── Props ──────────────────────────────────────────────────────────────────

interface NotificationDropdownProps {
  /** The "View All" page link — differs per dashboard role. */
  viewAllHref: string;
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_VISIBLE = 4;

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationDropdown({
  viewAllHref,
  onClose,
}: NotificationDropdownProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore(selectUnreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const recent = notifications.slice(0, MAX_VISIBLE);

  return (
    <div className="fixed inset-x-0 top-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 mx-3 sm:mx-0 sm:w-80 bg-white rounded-xl shadow-card border border-neutral-200 z-[70] overflow-hidden animate-dropdown">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 bg-neutral-50">
        <h3 className="text-sm font-semibold text-neutral-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-brand-blue/10 text-brand-blue">
              {unreadCount}
            </span>
          )}
        </h3>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue-dark hover:underline cursor-pointer transition-colors"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-neutral-100">
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-neutral-400">
            No notifications yet.
          </p>
        ) : (
          recent.map((n) => (
            <div key={n.id} onClick={onClose}>
              <NotificationItem
                notification={n}
                onToggleRead={markAsRead}
                variant="compact"
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-neutral-200 bg-neutral-50">
          <Link
            href={viewAllHref}
            onClick={onClose}
            className="block text-center text-sm font-medium text-brand-blue hover:text-brand-blue-dark py-2.5 transition-colors"
          >
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
