'use client';

import { cn } from '@/lib/utils';

/**
 * Booking status pills with WCAG AA contrast (#2197).
 *
 * The old inline map used translucent backgrounds (`bg-emerald-500/20`) with
 * light text and a 60%-opacity fallback (`text-blue-300/60`). On the dark
 * booking screens those pairs fall below 4.5:1. Each pair below is opaque, so
 * the ratio is independent of whatever page sits behind the pill and the
 * original status hues are preserved. Colours are applied inline from this
 * exported map so the contrast contract is testable rather than implied by a
 * utility class name.
 */
export const BOOKING_STATUS_BADGE_COLORS = {
  confirmed: { background: '#064e3b', foreground: '#d1fae5' },
  pending: { background: '#78350f', foreground: '#fef3c7' },
  cancelled: { background: '#7f1d1d', foreground: '#fee2e2' },
  completed: { background: '#1e3a8a', foreground: '#dbeafe' },
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS_BADGE_COLORS;

export const DEFAULT_BOOKING_STATUS_BADGE_COLORS = {
  background: '#1e293b',
  foreground: '#f1f5f9',
} as const;

export function bookingStatusBadgeColors(status?: string) {
  if (
    status &&
    Object.prototype.hasOwnProperty.call(BOOKING_STATUS_BADGE_COLORS, status)
  ) {
    return BOOKING_STATUS_BADGE_COLORS[status as BookingStatus];
  }
  return DEFAULT_BOOKING_STATUS_BADGE_COLORS;
}

export interface BookingStatusBadgeProps {
  status?: string;
  className?: string;
}

export default function BookingStatusBadge({
  status,
  className,
}: BookingStatusBadgeProps) {
  const colors = bookingStatusBadgeColors(status);

  return (
    <span
      data-status={status ?? 'unknown'}
      style={{ backgroundColor: colors.background, color: colors.foreground }}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
        className,
      )}
    >
      {status}
    </span>
  );
}
