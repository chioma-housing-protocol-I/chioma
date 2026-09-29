import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockUseTenantReview = vi.fn();
const mockMutateAsyncUpdate = vi.fn();
const mockMutateAsyncDelete = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/query/hooks/use-tenant-reviews', () => ({
  useTenantReview: (id: string) => mockUseTenantReview(id),
  useUpdateReview: () => ({
    mutateAsync: mockMutateAsyncUpdate,
    isPending: false,
  }),
  useDeleteReview: () => ({ mutateAsync: mockMutateAsyncDelete }),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import toast from 'react-hot-toast';
import {
  ReviewForm,
  type ReviewFormData,
} from '@/components/reviews/ReviewForm';

const mockReview = {
  id: 'rev-1',
  reviewId: 'RVW-001',
  target: 'James Adebayo',
  targetRole: 'LANDLORD' as const,
  propertyName: 'Sunset Apartments',
  rating: 4,
  comment: 'Great landlord overall.',
  status: 'PUBLISHED' as const,
  context: 'LEASE' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  responseCount: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSubmitButton() {
  return screen.getByRole('button', { name: /mint nft rating/i });
}

function getCommentTextarea() {
  return screen.getByRole('textbox');
}

function getStarButton(n: number) {
  return screen.getByLabelText(`Rate ${n} stars`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReviewForm', () => {
  // Spy stored separately so we can assert against it while props use typed wrapper
  let onSubmitSpy = vi.fn();
  const onSubmit = async (data: ReviewFormData) =>
    onSubmitSpy(data) as Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmitSpy = vi.fn().mockResolvedValue(undefined);
    // Create-mode tests never pass reviewId, so useTenantReview('') stays
    // disabled/unused in production (enabled: !!id) - default the mock to
    // "no review" here so it can't leak edit-mode data into create-mode
    // tests; edit-mode tests below set mockReview explicitly.
    mockUseAuth.mockReturnValue({ walletAddress: '0xABC123' });
    mockUseTenantReview.mockReturnValue({ data: undefined, isLoading: false });
    mockMutateAsyncUpdate.mockResolvedValue(undefined);
    mockMutateAsyncDelete.mockResolvedValue(undefined);
  });

  it('renders rating stars and comment textarea', () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    expect(screen.getAllByRole('button')).not.toHaveLength(0);
    expect(getCommentTextarea()).toBeDefined();
  });

  it('submit button is disabled when no star rating is selected', () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    expect(getSubmitButton()).toHaveProperty('disabled', true);
  });

  it('submit button is enabled after selecting a rating', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.click(getStarButton(4));
    await waitFor(() => {
      expect(getSubmitButton()).toHaveProperty('disabled', false);
    });
  });

  it('shows rating validation error when submitting without a rating', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    const form = screen
      .getByRole('button', { name: /mint nft rating/i })
      .closest('form')!;
    // Manually fire submit even though button is disabled
    fireEvent.submit(form);
    await waitFor(() => {
      // Surfaced both in the inline field error and the form-level error
      // summary (FormErrorSummary), so at least one match is expected.
      expect(
        screen.getAllByText('Please select a rating').length,
      ).toBeGreaterThan(0);
    });
  });

  it('shows comment minimum length error when comment is too short', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.click(getStarButton(3));
    fireEvent.change(getCommentTextarea(), { target: { value: 'short' } });
    fireEvent.submit(
      screen.getByRole('button', { name: /mint nft rating/i }).closest('form')!,
    );
    await waitFor(() => {
      // Surfaced both in the inline field error and the form-level error
      // summary (FormErrorSummary), so at least one match is expected.
      expect(
        screen.getAllByText('Review must be at least 10 characters').length,
      ).toBeGreaterThan(0);
    });
  });

  it('shows comment max length error when comment exceeds 500 chars', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.click(getStarButton(5));
    fireEvent.change(getCommentTextarea(), {
      target: { value: 'a'.repeat(501) },
    });
    fireEvent.submit(getSubmitButton().closest('form')!);
    await waitFor(() => {
      // Surfaced both in the inline field error and the form-level error
      // summary (FormErrorSummary), so at least one match is expected.
      expect(
        screen.getAllByText('Review cannot exceed 500 characters').length,
      ).toBeGreaterThan(0);
    });
  });

  it('calls onSubmit with rating and comment when form is valid', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.click(getStarButton(5));
    fireEvent.change(getCommentTextarea(), {
      target: { value: 'This is a valid review comment for testing.' },
    });
    fireEvent.submit(getSubmitButton().closest('form')!);
    await waitFor(() => {
      expect(onSubmitSpy).toHaveBeenCalledWith({
        rating: 5,
        comment: 'This is a valid review comment for testing.',
      });
    });
  });

  it('renders cancel button when onCancel prop is provided', () => {
    const onCancel = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} onCancel={onCancel} />);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeDefined();
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('disables the submit button when isSubmitting is true', () => {
    const { container } = render(
      <ReviewForm onSubmit={onSubmit} isSubmitting />,
    );
    // When isSubmitting, the button renders a spinner icon instead of text
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn).toHaveProperty('disabled', true);
  });

  it('disables the cancel button when isSubmitting is true', () => {
    const onCancel = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} onCancel={onCancel} isSubmitting />);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toHaveProperty('disabled', true);
  });

  it('shows character count for the comment field', () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    expect(screen.getByText('0/500')).toBeDefined();
  });

  it('updates character count as user types', () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.change(getCommentTextarea(), { target: { value: 'Hello' } });
    expect(screen.getByText('5/500')).toBeDefined();
  });

  it('resets form after successful submission', async () => {
    render(<ReviewForm onSubmit={onSubmit} />);
    fireEvent.click(getStarButton(3));
    fireEvent.change(getCommentTextarea(), {
      target: { value: 'A valid review with enough characters.' },
    });
    fireEvent.submit(getSubmitButton().closest('form')!);
    await waitFor(() => {
      expect(onSubmitSpy).toHaveBeenCalled();
    });
    // After reset, character count goes back to 0
    await waitFor(() => {
      expect(screen.getByText('0/500')).toBeDefined();
    });
  });

  describe('edit mode (reviewId provided) (#1556)', () => {
    beforeEach(() => {
      mockUseTenantReview.mockReturnValue({ data: mockReview, isLoading: false });
    });

    it('shows a loading state while the review is being fetched', () => {
      mockUseTenantReview.mockReturnValue({ data: undefined, isLoading: true });

      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      expect(screen.getByText('Loading review...')).toBeInTheDocument();
    });

    it('populates the form with the loaded review', () => {
      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      expect(screen.getByText('Edit Review')).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Great landlord overall.'),
      ).toBeInTheDocument();
    });

    it('shows the delete button only when an existing review is loaded', () => {
      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('does not show the delete button when there is no review yet', () => {
      mockUseTenantReview.mockReturnValue({ data: undefined, isLoading: false });

      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('blocks submission and shows a toast when no wallet is connected', async () => {
      mockUseAuth.mockReturnValue({ walletAddress: null });

      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      fireEvent.click(screen.getByText('Mint NFT Rating'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Please connect your Web3 wallet to mint this rating.',
        );
      });
      expect(mockMutateAsyncUpdate).not.toHaveBeenCalled();
    });

    it('submits the updated rating and comment via useUpdateReview, then navigates away', async () => {
      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      const textarea = screen.getByPlaceholderText('Share your experience...');
      fireEvent.change(textarea, { target: { value: 'Updated review text' } });

      fireEvent.click(screen.getByText('Mint NFT Rating'));

      await waitFor(
        () => {
          expect(mockMutateAsyncUpdate).toHaveBeenCalledWith({
            id: 'rev-1',
            payload: { rating: 4, comment: 'Updated review text' },
          });
        },
        { timeout: 3000 },
      );
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/user/reviews'));
    });

    it('navigates back when Cancel is clicked', () => {
      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockPush).toHaveBeenCalledWith('/user/reviews');
    });

    it('deletes the review after confirmation and navigates away', async () => {
      vi.stubGlobal(
        'confirm',
        vi.fn(() => true),
      );

      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(mockMutateAsyncDelete).toHaveBeenCalledWith('rev-1');
      });
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/user/reviews'));

      vi.unstubAllGlobals();
    });

    it('updates the rating when a star is clicked', () => {
      render(React.createElement(ReviewForm, { reviewId: 'rev-1' }));

      fireEvent.click(getStarButton(2));

      expect(screen.getByText('Mint NFT Rating')).not.toBeDisabled();
    });
  });
});
