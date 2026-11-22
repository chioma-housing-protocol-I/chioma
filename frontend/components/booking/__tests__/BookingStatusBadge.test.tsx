import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import BookingStatusBadge, {
  BOOKING_STATUS_BADGE_COLORS,
  DEFAULT_BOOKING_STATUS_BADGE_COLORS,
  bookingStatusBadgeColors,
} from '../BookingStatusBadge';

/** WCAG 2.1 relative luminance and contrast ratio. */
function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((value) => {
      const srgb = parseInt(value, 16) / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(background: string, foreground: string): number {
  const a = relativeLuminance(background);
  const b = relativeLuminance(foreground);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('BookingStatusBadge contrast (#2197)', () => {
  it('gives every known status at least 4.5:1 text contrast', () => {
    for (const [status, colors] of Object.entries(
      BOOKING_STATUS_BADGE_COLORS,
    )) {
      expect(
        contrastRatio(colors.background, colors.foreground),
        `${status} should meet WCAG AA text contrast`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives the unknown-status fallback at least 4.5:1 text contrast', () => {
    expect(
      contrastRatio(
        DEFAULT_BOOKING_STATUS_BADGE_COLORS.background,
        DEFAULT_BOOKING_STATUS_BADGE_COLORS.foreground,
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('renders the opaque pair as inline styles so the tested colours are the rendered colours', () => {
    render(<BookingStatusBadge status="pending" />);
    const badge = screen.getByText('pending');

    expect(badge).toHaveStyle({
      backgroundColor: BOOKING_STATUS_BADGE_COLORS.pending.background,
      color: BOOKING_STATUS_BADGE_COLORS.pending.foreground,
    });
  });

  it('uses the fallback pair for unknown or missing statuses', () => {
    expect(bookingStatusBadgeColors('not-a-status')).toEqual(
      DEFAULT_BOOKING_STATUS_BADGE_COLORS,
    );
    expect(bookingStatusBadgeColors()).toEqual(
      DEFAULT_BOOKING_STATUS_BADGE_COLORS,
    );

    render(<BookingStatusBadge status="archived" />);
    const badge = screen.getByText('archived');
    expect(badge).toHaveStyle({
      backgroundColor: DEFAULT_BOOKING_STATUS_BADGE_COLORS.background,
      color: DEFAULT_BOOKING_STATUS_BADGE_COLORS.foreground,
    });
  });
});
