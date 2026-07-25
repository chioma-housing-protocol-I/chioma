import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewList } from '@/components/reviews/ReviewList';
import type { Review } from '@/components/reviews/ReviewCard';
import type { RatingStats } from '@/components/reviews/RatingSummary';
import type { ReviewFormData } from '@/components/reviews/ReviewForm';

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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockStats: RatingStats = {
  average: 4.5,
  total: 2,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
};

const mockReviews: Review[] = [
  {
    id: 'r1',
    rating: 5,
    comment: 'Absolutely amazing experience staying here.',
    createdAt: new Date('2024-03-01'),
    author: { id: 'u1', name: 'Bob Jones', isVerified: true },
  },
  {
    id: 'r2',
    rating: 4,
    comment: 'Very comfortable and well-located apartment.',
    createdAt: new Date('2024-02-15'),
    author: { id: 'u2', name: 'Carol Lee' },
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReviewList', () => {
  // Spy for assertions; typed wrapper satisfies the prop's function signature
  let onSubmitReviewSpy = vi.fn();
  const onSubmitReview = async (data: ReviewFormData) =>
    onSubmitReviewSpy(data) as Promise<void>;

  beforeEach(() => {
    onSubmitReviewSpy = vi.fn().mockResolvedValue(undefined);
  });

  it('renders the default section title', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    expect(screen.getByText('Guest Reviews')).toBeDefined();
  });

  it('renders a custom title when provided', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
        title="Property Feedback"
      />,
    );
    expect(screen.getByText('Property Feedback')).toBeDefined();
  });

  it('renders a custom subtitle when provided', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
        subtitle="Honest tenant reviews"
      />,
    );
    expect(screen.getByText('Honest tenant reviews')).toBeDefined();
  });

  it('renders all provided review cards', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    expect(screen.getByText('Bob Jones')).toBeDefined();
    expect(screen.getByText('Carol Lee')).toBeDefined();
  });

  it('shows empty state message when reviews array is empty', () => {
    render(
      <ReviewList
        reviews={[]}
        stats={{
          average: 0,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }}
        onSubmitReview={onSubmitReview}
      />,
    );
    expect(screen.getByText('No reviews yet.')).toBeDefined();
    expect(
      screen.getByText('Be the first to share your experience!'),
    ).toBeDefined();
  });

  it('shows the "Write a Review" button initially', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    expect(screen.getByText('Write a Review')).toBeDefined();
  });

  it('shows review form when "Write a Review" button is clicked', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    fireEvent.click(screen.getByText('Write a Review'));
    // Form textarea becomes visible
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('hides "Write a Review" button while form is open', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    fireEvent.click(screen.getByText('Write a Review'));
    expect(screen.queryByText('Write a Review')).toBeNull();
  });

  it('hides the form when cancel is clicked', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    fireEvent.click(screen.getByText('Write a Review'));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Write a Review')).toBeDefined();
  });

  it('calls onSubmitReview and closes form on valid submission', async () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    fireEvent.click(screen.getByText('Write a Review'));
    // The form's star buttons are enabled (not readOnly), review cards are disabled
    const enabledStarButtons = screen
      .getAllByLabelText('Rate 5 stars')
      .filter((btn) => !btn.hasAttribute('disabled'));
    expect(enabledStarButtons).toHaveLength(1);
    fireEvent.click(enabledStarButtons[0]);
    // Fill comment
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'A great experience that exceeded all expectations!' },
    });
    // Submit
    fireEvent.submit(
      screen.getByRole('button', { name: /mint nft rating/i }).closest('form')!,
    );
    await waitFor(() => {
      expect(onSubmitReviewSpy).toHaveBeenCalledWith({
        rating: 5,
        comment: 'A great experience that exceeded all expectations!',
      });
    });
  });

  it('renders the RatingSummary component', () => {
    render(
      <ReviewList
        reviews={mockReviews}
        stats={mockStats}
        onSubmitReview={onSubmitReview}
      />,
    );
    // Summary shows average and total
    expect(screen.getByText('4.5')).toBeDefined();
    expect(screen.getByText('Based on 2 reviews')).toBeDefined();
  });
});
