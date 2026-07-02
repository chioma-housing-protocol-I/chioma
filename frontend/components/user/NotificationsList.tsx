'use client';

import { useMemo, useState } from 'react';
import {
  ArchiveX,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import NotificationItem from '@/components/common/NotificationItem';
import {
  LandlordNotification,
  LandlordNotificationType,
  NotificationReadFilter,
  NotificationSortOrder,
  NOTIFICATION_TYPE_LABELS,
} from './notifications.types';

const queryKey = ['landlord-notifications'];
const archivedStorageKey = 'chioma_landlord_archived_notifications';
const PAGE_SIZE = 6;

type NotificationsListProps = {
  userId?: string;
};

function normalizeNotificationType(
  type: string | null | undefined,
): LandlordNotificationType {
  const normalized = (type || '').toLowerCase();

  if (normalized.includes('payment')) return 'payment';
  if (normalized.includes('maintenance')) return 'maintenance';
  if (
    normalized.includes('tenant') ||
    normalized.includes('agreement') ||
    normalized.includes('message')
  ) {
    return 'tenant';
  }
  return 'system';
}

function readArchivedIds(userId?: string): string[] {
  if (typeof window === 'undefined' || !userId) return [];

  try {
    const raw = localStorage.getItem(`${archivedStorageKey}:${userId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistArchivedIds(userId: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${archivedStorageKey}:${userId}`, JSON.stringify(ids));
}

export default function NotificationsList({ userId }: NotificationsListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    'all' | LandlordNotificationType
  >('all');
  const [statusFilter, setStatusFilter] =
    useState<NotificationReadFilter>('all');
  const [sortOrder, setSortOrder] = useState<NotificationSortOrder>('newest');
  const [page, setPage] = useState(1);
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);
  const [archivedIds, setArchivedIds] = useState<string[]>(() =>
    readArchivedIds(userId),
  );

  const notificationsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<
        Array<{
          id: string;
          title: string;
          message: string;
          isRead: boolean;
          type: string;
          createdAt: string;
        }>
      >('/notifications');

      return data.map(
        (notification): LandlordNotification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          isRead: notification.isRead,
          type: normalizeNotificationType(notification.type),
          createdAt: notification.createdAt,
        }),
      );
    },
    enabled: Boolean(userId),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<LandlordNotification[]>(
        queryKey,
        (current) =>
          current?.map((notification) =>
            notification.id === id
              ? { ...notification, isRead: true }
              : notification,
          ) ?? [],
      );
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.setQueryData<LandlordNotification[]>(
        queryKey,
        (current) =>
          current?.map((notification) => ({ ...notification, isRead: true })) ??
          [],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notifications/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<LandlordNotification[]>(
        queryKey,
        (current) =>
          current?.filter((notification) => notification.id !== id) ?? [],
      );
      if (selectedNotificationId === id) {
        setSelectedNotificationId(null);
      }
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const filteredNotifications = useMemo(() => {
    const loweredSearch = search.trim().toLowerCase();

    const next = notifications
      .filter((notification) => !archivedIds.includes(notification.id))
      .filter((notification) =>
        typeFilter === 'all' ? true : notification.type === typeFilter,
      )
      .filter((notification) => {
        if (statusFilter === 'read') return notification.isRead;
        if (statusFilter === 'unread') return !notification.isRead;
        return true;
      })
      .filter((notification) => {
        if (!loweredSearch) return true;

        return (
          notification.title.toLowerCase().includes(loweredSearch) ||
          notification.message.toLowerCase().includes(loweredSearch)
        );
      })
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();
        return sortOrder === 'newest'
          ? rightTime - leftTime
          : leftTime - rightTime;
      });

    return next;
  }, [archivedIds, notifications, search, sortOrder, statusFilter, typeFilter]);

  const unreadCount = filteredNotifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const selectedNotification =
    filteredNotifications.find(
      (notification) => notification.id === selectedNotificationId,
    ) ?? paginatedNotifications[0];

  const archiveNotification = (id: string) => {
    if (!userId) return;

    const next = [...new Set([...archivedIds, id])];
    setArchivedIds(next);
    persistArchivedIds(userId, next);

    if (selectedNotificationId === id) {
      setSelectedNotificationId(null);
    }
  };

  if (notificationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
        {(notificationsQuery.error as Error).message ||
          'Unable to load landlord notifications.'}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                Notification Inbox
              </h2>
              <span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
                {unreadCount} unread
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Review recent landlord activity, payment updates, maintenance
              requests, and system alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={markAllAsReadMutation.isPending || unreadCount === 0}
              onClick={() => markAllAsReadMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
            <button
              type="button"
              disabled={!userId || archivedIds.length === 0}
              onClick={() => {
                setArchivedIds([]);
                if (userId) {
                  persistArchivedIds(userId, []);
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArchiveX className="h-4 w-4" />
              Restore archived
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search notifications"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </label>

          <FilterSelect
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value as 'all' | LandlordNotificationType);
              setPage(1);
            }}
            options={[
              { label: 'All types', value: 'all' },
              ...Object.entries(NOTIFICATION_TYPE_LABELS).map(
                ([value, label]) => ({
                  label,
                  value,
                }),
              ),
            ]}
          />

          <FilterSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as NotificationReadFilter);
              setPage(1);
            }}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Unread', value: 'unread' },
              { label: 'Read', value: 'read' },
            ]}
          />

          <FilterSelect
            value={sortOrder}
            onChange={(value) => setSortOrder(value as NotificationSortOrder)}
            options={[
              { label: 'Newest first', value: 'newest' },
              { label: 'Oldest first', value: 'oldest' },
            ]}
          />
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-slate-900/40 px-6 py-16 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">
            No notifications found
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Adjust your filters or wait for new landlord activity to appear
            here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            {paginatedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                isSelected={selectedNotification?.id === notification.id}
                isBusy={
                  markAsReadMutation.isPending || deleteMutation.isPending
                }
                onSelect={(selected) => {
                  setSelectedNotificationId(selected.id);
                  if (!selected.isRead) {
                    markAsReadMutation.mutate(selected.id);
                  }
                }}
                onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onArchive={archiveNotification}
              />
            ))}

            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-blue-200">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Notification Detail
                </h3>
                <p className="text-sm text-slate-300">
                  Open a notification to see the complete message.
                </p>
              </div>
            </div>

            {selectedNotification ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
                    {NOTIFICATION_TYPE_LABELS[selectedNotification.type]}
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-white">
                    {selectedNotification.title}
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {selectedNotification.message}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Select a notification from the list to inspect it here.
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
};

function FilterSelect({ value, onChange, options }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition hover:bg-white/10"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-slate-900"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
