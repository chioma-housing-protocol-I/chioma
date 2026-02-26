'use client';

import React, { useState, useEffect } from 'react';
import { CheckCheck, Filter } from 'lucide-react';
import {
  useNotificationStore,
  selectUnreadCount,
} from '@/store/notificationStore';
import NotificationItem from './NotificationItem';
import NotificationsPageSkeleton from './NotificationsPageSkeleton';
import type { NotificationType } from './types';

// ─── Filter options ─────────────────────────────────────────────────────────

type FilterValue = 'all' | NotificationType;

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Messages', value: 'message' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Payments', value: 'payment' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore(selectUnreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const isLoaded = useNotificationStore((s) => s.isLoaded);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const [filter, setFilter] = useState<FilterValue>('all');

  // Hydrate on mount
  useEffect(() => {
    if (!isLoaded) fetchNotifications();
  }, [isLoaded, fetchNotifications]);

  // Show skeleton while loading
  if (!isLoaded) {
    return <NotificationsPageSkeleton />;
  }

  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  const handleToggleRead = (id: string) => {
    const n = notifications.find((n) => n.id === id);
    if (!n || n.read) return;
    markAsRead(id);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'You\u2019re all caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-dark hover:underline cursor-pointer"
          >
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <Filter size={16} className="text-gray-400 shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filter === f.value
                ? 'bg-brand-blue-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card divide-y divide-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">
            No notifications to show.
          </p>
        ) : (
          filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onToggleRead={handleToggleRead}
              variant="full"
            />
          ))
        )}
      </div>
    </div>
  );
}
