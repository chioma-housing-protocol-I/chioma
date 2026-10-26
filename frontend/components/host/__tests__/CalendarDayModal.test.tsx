import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarDayModal } from '../CalendarDayModal';
import type { AvailabilityDay } from '@/lib/query/hooks/use-availability';

const baseDay: AvailabilityDay = {
  date: '2026-11-05',
  available: true,
  customPrice: null,
  notes: null,
  blockedByBookingId: null,
};

describe('CalendarDayModal', () => {
  it('shows the block action when the day is available', () => {
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Block this date' }),
    ).toBeInTheDocument();
  });

  it('shows Booked status and disables unblock when a booking owns the date', () => {
    render(
      <CalendarDayModal
        day={{ ...baseDay, available: false, blockedByBookingId: 'bk-1' }}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    expect(screen.getByText('Booked')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unblock this date' }),
    ).toBeDisabled();
  });

  it('shows Blocked status and an enabled unblock button when manually blocked', () => {
    render(
      <CalendarDayModal
        day={{ ...baseDay, available: false, blockedByBookingId: null }}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    const unblockButton = screen.getByRole('button', {
      name: 'Unblock this date',
    });
    expect(unblockButton).not.toBeDisabled();
    fireEvent.click(unblockButton);
  });

  it('calls onBlock when the block button is clicked', () => {
    const onBlock = vi.fn();
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={vi.fn()}
        onBlock={onBlock}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Block this date' }));
    expect(onBlock).toHaveBeenCalledTimes(1);
  });

  it('submits a valid price via onSetPrice', () => {
    const onSetPrice = vi.fn();
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={onSetPrice}
      />,
    );

    fireEvent.change(screen.getByLabelText('Nightly price'), {
      target: { value: '125.50' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSetPrice).toHaveBeenCalledWith(125.5);
  });

  it('disables Save and does not call onSetPrice for an invalid price', () => {
    const onSetPrice = vi.fn();
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={onSetPrice}
      />,
    );

    fireEvent.change(screen.getByLabelText('Nightly price'), {
      target: { value: '' },
    });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSetPrice).not.toHaveBeenCalled();
  });

  it('shows the error message when provided', () => {
    render(
      <CalendarDayModal
        day={baseDay}
        error="Could not save price"
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    expect(screen.getByText('Could not save price')).toBeInTheDocument();
  });

  it('disables action buttons while saving', () => {
    render(
      <CalendarDayModal
        day={baseDay}
        isSaving={true}
        onClose={vi.fn()}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Block this date' }),
    ).toBeDisabled();
  });

  it('calls onClose when the close button or backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CalendarDayModal
        day={baseDay}
        onClose={onClose}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector('.fixed.inset-0')!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('does not close when clicking inside the modal panel', () => {
    const onClose = vi.fn();
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={onClose}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Nightly price'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <CalendarDayModal
        day={baseDay}
        onClose={onClose}
        onBlock={vi.fn()}
        onUnblock={vi.fn()}
        onSetPrice={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
