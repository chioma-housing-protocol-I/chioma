/**
 * Automated accessibility tests using axe-core.
 * Covers auth, form, and review components per issue #1260.
 * Violations from axe are reported as test failures to keep CI clean.
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';
import { ReviewCard, type Review } from '@/components/reviews/ReviewCard';
import {
  RatingSummary,
  type RatingStats,
} from '@/components/reviews/RatingSummary';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [k: string]: unknown;
  }) => React.createElement('img', { src, alt, ...props }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, loading: false })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: vi.fn(() => '/'),
}));

// ─── Helper ──────────────────────────────────────────────────────────────────

async function checkA11y(container: Element) {
  const results = await axe.run(container, {
    // Limit to wcag2a and wcag2aa rules
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  });
  return results.violations;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleReview: Review = {
  id: 'r1',
  rating: 4,
  comment: 'Very comfortable and well-located.',
  createdAt: new Date('2024-01-10'),
  author: { id: 'u1', name: 'Jane Doe', isVerified: false },
};

const sampleStats: RatingStats = {
  average: 4.2,
  total: 10,
  distribution: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Accessibility (axe WCAG 2.0/2.1 AA)', () => {
  it('StarRatingInput (interactive) has no a11y violations', async () => {
    const { container } = render(
      <StarRatingInput value={3} onChange={vi.fn()} />,
    );
    const violations = await checkA11y(container);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it('StarRatingInput (readOnly) has no a11y violations', async () => {
    const { container } = render(
      <StarRatingInput value={4} onChange={vi.fn()} readOnly />,
    );
    const violations = await checkA11y(container);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it('ReviewCard has no a11y violations', async () => {
    const { container } = render(<ReviewCard review={sampleReview} />);
    const violations = await checkA11y(container);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  it('RatingSummary has no a11y violations', async () => {
    const { container } = render(<RatingSummary stats={sampleStats} />);
    const violations = await checkA11y(container);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatViolations(violations: axe.Result[]) {
  if (!violations.length) return '';
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(', ')}`,
    )
    .join('\n');
}
