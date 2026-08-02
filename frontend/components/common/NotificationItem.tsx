'use client';

import {
  Bell,
  CheckCheck,
  CreditCard,
  Settings2,
  UserRound,
  Wrench,
  Trash2,
  Archive,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { format } from 'date-fns';
import {
  LandlordNotification,
  LandlordNotificationType,
  NOTIFICATION_TYPE_LABELS,
} from '@/components/user/notifications.types';

type NotificationItemProps = {
  notification: LandlordNotification;
  isSelected?: boolean;
  onSelect: (notification: LandlordNotification) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  isBusy?: boolean;
};

const typeStyles: Record<
  LandlordNotificationType,
  {
    icon: ComponentType<{ className?: string }>;
    badge: string;
    iconWrap: string;
  }
> = {
  payment: {
    icon: CreditCard,
    badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20',
    iconWrap: 'bg-emerald-500/15 text-emerald-300',
  },
  maintenance: {
    icon: Wrench,
    badge: 'bg-amber-500/15 text-amber-200 border-amber-400/20',
    iconWrap: 'bg-amber-500/15 text-amber-300',
  },
  tenant: {
    icon: UserRound,
    badge: 'bg-sky-500/15 text-sky-200 border-sky-400/20',
    iconWrap: 'bg-sky-500/15 text-sky-300',
  },
  system: {
    icon: Settings2,
    badge: 'bg-violet-500/15 text-violet-200 border-violet-400/20',
    iconWrap: 'bg-violet-500/15 text-violet-300',
  },
};

export default function NotificationItem({
  notification,
  isSelected = false,
  onSelect,
  onMarkAsRead,
  onDelete,
  onArchive,
  isBusy = false,
}: NotificationItemProps) {
  const { icon: Icon, badge, iconWrap } = typeStyles[notification.type];

  return (
    <article
      className={`rounded-2xl border transition-all ${
        isSelected
          ? 'border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-950/20'
          : notification.isRead
            ? 'border-white/10 bg-slate-900/40 hover:border-white/20 hover:bg-white/5'
            : 'border-blue-400/20 bg-blue-500/10 hover:border-blue-300/35 hover:bg-blue-500/15'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="flex w-full items-start gap-4 p-4 text-left"
      >
        <div
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconWrap}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badge}`}
            >
              {NOTIFICATION_TYPE_LABELS[notification.type]}
            </span>
            {!notification.isRead && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/15 px-2 py-1 text-[11px] font-semibold text-blue-200">
                <Bell className="h-3.5 w-3.5" />
                Unread
              </span>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white sm:text-base">
                {notification.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                {notification.message}
              </p>
            </div>

            {!notification.isRead && (
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-300" />
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-4 py-3">
        {!notification.isRead && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onMarkAsRead(notification.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" />
            Mark read
          </button>
        )}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onArchive(notification.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Archive className="h-4 w-4" />
          Archive
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onDelete(notification.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}
