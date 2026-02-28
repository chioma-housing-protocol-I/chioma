'use client';

import React from 'react';
import Link from 'next/link';
import { MessageSquare, Wrench, CreditCard, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Notification, NotificationType } from './types';

// ─── Icon / colour mapping per notification type ────────────────────────────

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; bg: string; text: string }
> = {
  message: {
    icon: MessageSquare,
    bg: 'bg-blue-50',
    text: 'text-brand-blue-dark',
  },
  maintenance: {
    icon: Wrench,
    bg: 'bg-orange-50',
    text: 'text-brand-orange',
  },
  payment: {
    icon: CreditCard,
    bg: 'bg-green-50',
    text: 'text-brand-green',
  },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  /** Called when the user clicks "Mark read". */
  onToggleRead: (id: string) => void;
  /** Compact = dropdown row, full = page row. */
  variant?: 'compact' | 'full';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationItem({
  notification,
  onToggleRead,
  variant = 'compact',
}: NotificationItemProps) {
  const { icon: Icon, bg, text } = typeConfig[notification.type];
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const content = (
    <div
      className={`flex items-start gap-3 px-4 transition-colors
        ${variant === 'compact' ? 'py-2.5' : 'py-4'}
        ${notification.read ? 'bg-white' : 'bg-blue-50/40'}
        ${variant === 'compact' ? 'hover:bg-gray-50' : 'hover:bg-gray-50'}
      `}
    >
      {/* Icon */}
      <div
        className={`shrink-0 ${variant === 'compact' ? 'w-8 h-8' : 'w-9 h-9'} flex items-center justify-center rounded-full ${bg}`}
      >
        <Icon size={variant === 'compact' ? 14 : 16} className={text} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm ${
              notification.read
                ? 'font-normal text-gray-500'
                : 'font-semibold text-gray-900'
            }`}
          >
            {notification.title}
          </p>

          {!notification.read && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-brand-blue" />
          )}
        </div>

        {variant === 'full' && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>

      {/* Read status indicator / mark-read button (full variant only) */}
      {variant === 'full' &&
        (notification.read ? (
          <span
            className="shrink-0 flex items-center gap-1 text-xs text-brand-blue mt-0.5"
            title="Read"
          >
            <CheckCheck size={16} />
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleRead(notification.id);
            }}
            className="shrink-0 text-xs text-brand-blue hover:text-brand-blue-dark hover:underline mt-0.5 cursor-pointer"
          >
            Mark read
          </button>
        ))}
    </div>
  );

  // If there's a link, wrap in a <Link>
  if (notification.link) {
    return (
      <Link href={notification.link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
