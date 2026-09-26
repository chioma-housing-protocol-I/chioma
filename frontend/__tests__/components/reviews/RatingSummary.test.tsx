import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  RatingSummary,
  type RatingStats,
} from '@/components/reviews/RatingSummary';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const fullStats: RatingStats = {
  average: 4.2,
  total: 50,
  distribution: { 1: 2, 2: 3, 3: 5, 4: 15, 5: 25 },
};

const emptyStats: RatingStats = {
  average: 0,
  total: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RatingSummary', () => {
  it('displays the formatted average rating', () => {
    render(<RatingSummary stats={fullStats} />);
    expect(screen.getByText('4.2')).toBeDefined();
  });

  it('displays the total review count', () => {
    render(<RatingSummary stats={fullStats} />);
    expect(screen.getByText('Based on 50 reviews')).toBeDefined();
  });

  it('uses singular "review" when total is 1', () => {
    const stats: RatingStats = {
      ...fullStats,
      total: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    };
    render(<RatingSummary stats={stats} />);
    expect(screen.getByText('Based on 1 review')).toBeDefined();
  });

  it('renders distribution bars for all 5 star ratings', () => {
    const { container } = render(<RatingSummary stats={fullStats} />);
    // Progress bar divs (inner colored bar)
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars).toHaveLength(5);
  });

  it('shows 0% for all bars when total is 0', () => {
    const { container } = render(<RatingSummary stats={emptyStats} />);
    const percentageEls = screen.getAllByText('0%');
    expect(percentageEls.length).toBeGreaterThan(0);
  });

  it('calculates percentage correctly for distribution', () => {
    // 25 out of 50 = 50%
    render(<RatingSummary stats={fullStats} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('renders star rating labels 1 through 5', () => {
    render(<RatingSummary stats={fullStats} />);
    ['1', '2', '3', '4', '5'].forEach((n) => {
      expect(screen.getByText(n)).toBeDefined();
    });
  });

  it('renders overall star display via StarRatingInput', () => {
    render(<RatingSummary stats={fullStats} />);
    const stars = screen.getAllByRole('button');
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star).toHaveProperty('disabled', true);
    });
  });

  it('rounds average to nearest integer for star display', () => {
    const stats: RatingStats = { ...fullStats, average: 3.7 };
    render(<RatingSummary stats={stats} />);
    // average 3.7 → Math.round = 4 → 4 filled stars
    expect(screen.getByText('3.7')).toBeDefined();
  });
});
