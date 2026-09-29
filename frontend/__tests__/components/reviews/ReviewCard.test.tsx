import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewCard, type Review } from '@/components/reviews/ReviewCard';

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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseReview: Review = {
  id: 'rev-1',
  rating: 4,
  comment: 'Great place to stay. Very clean and comfortable.',
  createdAt: new Date('2024-01-15T12:00:00Z'),
  author: {
    id: 'user-1',
    name: 'Alice Smith',
    isVerified: false,
  },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReviewCard', () => {
  it('renders the author name', () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByText('Alice Smith')).toBeDefined();
  });

  it('renders the review comment', () => {
    render(<ReviewCard review={baseReview} />);
    expect(
      screen.getByText('Great place to stay. Very clean and comfortable.'),
    ).toBeDefined();
  });

  it('renders a time-ago string for the review date', () => {
    render(<ReviewCard review={baseReview} />);
    // date-fns formatDistanceToNow returns something like "over 1 year ago"
    const timeEl = document.querySelector('time');
    expect(timeEl).not.toBeNull();
  });

  it('renders the correct dateTime attribute on the time element', () => {
    render(<ReviewCard review={baseReview} />);
    const timeEl = document.querySelector('time');
    expect(timeEl?.getAttribute('dateTime')).toBe('2024-01-15T12:00:00.000Z');
  });

  it('accepts createdAt as a string', () => {
    const review: Review = {
      ...baseReview,
      createdAt: '2024-06-01T10:00:00Z',
    };
    render(<ReviewCard review={review} />);
    const timeEl = document.querySelector('time');
    expect(timeEl?.getAttribute('dateTime')).toBe('2024-06-01T10:00:00Z');
  });

  it('shows verified badge when author isVerified is true', () => {
    const review: Review = {
      ...baseReview,
      author: { ...baseReview.author, isVerified: true },
    };
    const { container } = render(<ReviewCard review={review} />);
    // ShieldCheck icon is rendered as SVG
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('does not show verified badge when isVerified is false', () => {
    const { container } = render(<ReviewCard review={baseReview} />);
    // The ShieldCheck badge SVG has class "text-blue-400"
    const shieldCheck = container.querySelector('svg.text-blue-400');
    expect(shieldCheck).toBeNull();
  });

  it('renders author role when provided', () => {
    const review: Review = {
      ...baseReview,
      author: { ...baseReview.author, role: 'USER' },
    };
    render(<ReviewCard review={review} />);
    expect(screen.getByText('user')).toBeDefined();
  });

  it('renders avatar image when author has an avatar URL', () => {
    const review: Review = {
      ...baseReview,
      author: {
        ...baseReview.author,
        avatar: 'https://example.com/avatar.png',
      },
    };
    render(<ReviewCard review={review} />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
    expect(img.getAttribute('alt')).toBe('Alice Smith');
  });

  it('renders User icon fallback when no avatar is provided', () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders the star rating input in readOnly mode', () => {
    render(<ReviewCard review={{ ...baseReview, rating: 4 }} />);
    const stars = screen.getAllByRole('button');
    stars.forEach((star) => {
      expect(star).toHaveProperty('disabled', true);
    });
  });
});
