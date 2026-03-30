'use client';

import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  viewAllHref: string;
  onClose: () => void;
}

const MAX_VISIBLE = 4;

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
    <div className="fixed inset-x-0 top-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 mx-3 sm:mx-0 sm:w-80 backdrop-blur-xl bg-slate-900/95 rounded-xl shadow-2xl border border-white/10 z-[70] overflow-hidden animate-dropdown">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-white/5">
        <h3 className="text-sm font-semibold text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300">
              {unreadCount}
            </span>
          )}
        </h3>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-blue-300 hover:text-white transition-colors cursor-pointer"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-white/5">
        {recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-blue-200/40">
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
      <div className="border-t border-white/10 bg-white/5">
        <Link
          href={viewAllHref}
          onClick={onClose}
          className="block text-center text-sm font-medium text-blue-300 hover:text-white py-2.5 transition-colors"
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
}
