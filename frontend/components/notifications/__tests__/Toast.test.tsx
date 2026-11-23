import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { Toast, ToastContainer, ToastItem, toast } from '../Toast';
import { useUIStore } from '@/store/ui-store';

describe('Toast and ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useUIStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ToastItem (Individual Toast)', () => {
    it('renders title, message, and type icon correctly', () => {
      render(
        <ToastItem
          id="t-1"
          type="success"
          title="Profile Updated"
          message="Your changes were saved successfully."
        />,
      );

      expect(screen.getByText('Profile Updated')).toBeInTheDocument();
      expect(
        screen.getByText('Your changes were saved successfully.'),
      ).toBeInTheDocument();
      expect(screen.getByText(/success:/i)).toBeInTheDocument();
    });

    it('auto-dismisses after 4 seconds (4000ms) by default', () => {
      const handleDismiss = vi.fn();
      render(
        <ToastItem
          id="t-auto"
          title="Auto Dismiss"
          onDismiss={handleDismiss}
        />,
      );

      expect(handleDismiss).not.toHaveBeenCalled();

      // Fast-forward by 3999ms
      act(() => {
        vi.advanceTimersByTime(3999);
      });
      expect(handleDismiss).not.toHaveBeenCalled();

      // Reach 4000ms + exit animation delay (150ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(handleDismiss).toHaveBeenCalledWith('t-auto');
    });

    it('pauses timer on mouse enter and resumes on mouse leave', () => {
      const handleDismiss = vi.fn();
      render(
        <ToastItem
          id="t-hover"
          title="Hover Toast"
          onDismiss={handleDismiss}
        />,
      );

      const toastElement = screen.getByRole('status');

      // Advance by 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Hover
      fireEvent.mouseEnter(toastElement);

      // Wait another 3000ms while hovered (total 5000ms)
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(handleDismiss).not.toHaveBeenCalled();

      // Unhover
      fireEvent.mouseLeave(toastElement);

      // Advance remaining ~2000ms + exit delay
      act(() => {
        vi.advanceTimersByTime(2200);
      });
      expect(handleDismiss).toHaveBeenCalledWith('t-hover');
    });

    it('dismisses when close button is clicked', () => {
      const handleDismiss = vi.fn();
      render(
        <ToastItem
          id="t-click"
          title="Manual Close"
          onDismiss={handleDismiss}
        />,
      );

      const closeButton = screen.getByLabelText(
        'Dismiss notification: Manual Close',
      );
      fireEvent.click(closeButton);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(handleDismiss).toHaveBeenCalledWith('t-click');
    });

    it('executes custom action button click', () => {
      const handleAction = vi.fn();
      render(
        <ToastItem
          id="t-action"
          title="Item Deleted"
          action={{
            label: 'Undo',
            onClick: handleAction,
          }}
        />,
      );

      const undoButton = screen.getByText('Undo');
      fireEvent.click(undoButton);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('is aria-live accessible with role="status" for non-errors and role="alert" for errors', () => {
      const { rerender } = render(
        <ToastItem id="t-info" type="info" title="Information" />,
      );

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');

      rerender(
        <ToastItem id="t-error" type="error" title="Critical Failure" />,
      );

      const alertEl = screen.getByRole('alert');
      expect(alertEl).toHaveAttribute('aria-live', 'assertive');
    });
  });

  describe('ToastContainer (Corner and Stackable)', () => {
    it('renders stacked toasts in the specified corner', () => {
      const toasts = [
        { id: '1', type: 'success' as const, title: 'Toast 1' },
        { id: '2', type: 'error' as const, title: 'Toast 2' },
        { id: '3', type: 'info' as const, title: 'Toast 3' },
      ];

      const { container } = render(
        <ToastContainer toasts={toasts} position="bottom-right" />,
      );

      const region = screen.getByRole('region', { name: /notifications/i });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');

      // Check corner positioning classes
      expect(region.className).toContain('fixed');
      expect(region.className).toContain('bottom-5');
      expect(region.className).toContain('right-5');

      // Check all stacked toasts are rendered
      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
    });

    it('renders in other corners when specified', () => {
      const toasts = [{ id: '1', title: 'Top Left Toast' }];
      render(<ToastContainer toasts={toasts} position="top-left" />);

      const region = screen.getByRole('region', { name: /notifications/i });
      expect(region.className).toContain('top-5');
      expect(region.className).toContain('left-5');
    });

    it('limits stack to maxToasts', () => {
      const toasts = [
        { id: '1', title: 'Toast 1' },
        { id: '2', title: 'Toast 2' },
        { id: '3', title: 'Toast 3' },
        { id: '4', title: 'Toast 4' },
      ];

      render(<ToastContainer toasts={toasts} maxToasts={2} />);

      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });

    it('integrates with useUIStore and imperative toast triggers', () => {
      render(<ToastContainer />);

      // Initially empty
      expect(
        screen.queryByRole('region', { name: /notifications/i }),
      ).not.toBeInTheDocument();

      // Trigger imperative toast
      act(() => {
        toast.success('Payment Received', 'Amount: 200 USDC');
      });

      expect(screen.getByText('Payment Received')).toBeInTheDocument();
      expect(screen.getByText('Amount: 200 USDC')).toBeInTheDocument();

      // Trigger error toast
      act(() => {
        toast.error('Network Error', 'Connection failed');
      });

      expect(screen.getByText('Network Error')).toBeInTheDocument();
    });
  });
});
