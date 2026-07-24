'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Wrench,
  CreditCard,
  CheckCheck,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from './types';

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; bg: string; text: string }
> = {
  message: {
    icon: MessageSquare,
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-orange-500/15',
    text: 'text-orange-300',
  },
  payment: {
    icon: CreditCard,
    bg: 'bg-green-500/15',
    text: 'text-green-300',
  },
};

const fallbackConfig = {
  icon: Bell,
  bg: 'bg-white/10',
  text: 'text-blue-200/60',
};

interface NotificationItemProps {
  notification: Notification;
  onToggleRead: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: 'compact' | 'full';
}

export default function NotificationItem({
  notification,
  onToggleRead,
  onDelete,
  variant = 'compact',
}: NotificationItemProps) {
  const {
    icon: Icon,
    bg,
    text,
  } = typeConfig[notification.type] ?? fallbackConfig;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const content = (
    <div
      className={`flex items-start gap-3 px-4 transition-colors relative group
        ${variant === 'compact' ? 'py-2.5' : 'py-4'}
        ${notification.read ? 'bg-transparent' : 'bg-blue-500/5'}
        hover:bg-white/5
      `}
    >
      {/* Icon */}
      <div
        className={`shrink-0 ${variant === 'compact' ? 'w-8 h-8' : 'w-9 h-9'} flex items-center justify-center rounded-full ${bg}`}
      >
        <Icon size={variant === 'compact' ? 14 : 16} className={text} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm ${
              notification.read
                ? 'font-normal text-blue-200/50'
                : 'font-semibold text-white'
            }`}
          >
            {notification.title}
          </p>

          {!notification.read && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-400" />
          )}
        </div>

        {variant === 'full' && (
          <p className="text-sm text-blue-200/50 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}

        <p className="text-xs text-blue-200/30 mt-1">{timeAgo}</p>
      </div>

      {/* Action buttons */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {variant === 'full' &&
          (notification.read ? (
            <span className="shrink-0 flex items-center gap-1 text-xs text-blue-400/50 mt-0.5">
              <CheckCheck size={16} />
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleRead(notification.id);
              }}
              className="shrink-0 text-xs text-blue-300 hover:text-white hover:underline mt-0.5 cursor-pointer transition-colors"
            >
              Mark read
            </button>
          ))}

        {variant === 'full' && onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="opacity-0 group-hover:opacity-100 shrink-0 text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer transition-opacity"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
