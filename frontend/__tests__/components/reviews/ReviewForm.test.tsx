import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ReviewForm,
  type ReviewFormData,
} from '@/components/reviews/ReviewForm';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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
    onSubmitSpy = vi.fn().mockResolvedValue(undefined);
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
      expect(screen.getByText('Please select a rating')).toBeDefined();
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
      expect(
        screen.getByText('Review must be at least 10 characters'),
      ).toBeDefined();
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
      expect(
        screen.getByText('Review cannot exceed 500 characters'),
      ).toBeDefined();
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
});
