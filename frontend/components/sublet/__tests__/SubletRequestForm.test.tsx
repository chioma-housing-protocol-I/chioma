import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseUserAgreements = vi.fn();

vi.mock('@/lib/query/hooks/use-agreements', () => ({
  useUserAgreements: (...args: unknown[]) => mockUseUserAgreements(...args),
}));

import { SubletRequestForm } from '../SubletRequestForm';

const agreements = [
  { id: 'agreement-1', displayTitle: '221B Baker Street' },
  { id: 'agreement-2', displayTitle: '10 Downing Street' },
];

describe('SubletRequestForm', () => {
  beforeEach(() => {
    mockUseUserAgreements.mockReturnValue({
      data: { data: agreements, meta: {} },
      isLoading: false,
    });
  });

  it('renders agreement options loaded from useUserAgreements', () => {
    render(<SubletRequestForm onSubmit={vi.fn()} />);

    expect(screen.getByText('221B Baker Street')).toBeInTheDocument();
    expect(screen.getByText('10 Downing Street')).toBeInTheDocument();
  });

  it('shows a loading placeholder while agreements are loading', () => {
    mockUseUserAgreements.mockReturnValue({ data: undefined, isLoading: true });
    render(<SubletRequestForm onSubmit={vi.fn()} />);

    expect(screen.getByText('Loading agreements…')).toBeInTheDocument();
  });

  it('rejects submission without a selected agreement', async () => {
    const onSubmit = vi.fn();
    render(<SubletRequestForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Please select an agreement').length,
      ).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an end date that is not after the start date', async () => {
    const onSubmit = vi.fn();
    render(<SubletRequestForm onSubmit={onSubmit} />);

    fireEvent.change(document.getElementById('agreementId')!, {
      target: { value: 'agreement-1' },
    });
    fireEvent.change(document.getElementById('startDate')!, {
      target: { value: '2026-02-10' },
    });
    fireEvent.change(document.getElementById('endDate')!, {
      target: { value: '2026-02-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText('End date must be after start date').length,
      ).toBeGreaterThan(0);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the validated payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<SubletRequestForm onSubmit={onSubmit} />);

    fireEvent.change(document.getElementById('agreementId')!, {
      target: { value: 'agreement-1' },
    });
    fireEvent.change(document.getElementById('startDate')!, {
      target: { value: '2026-02-01' },
    });
    fireEvent.change(document.getElementById('endDate')!, {
      target: { value: '2026-02-10' },
    });
    fireEvent.change(document.getElementById('reason')!, {
      target: { value: 'Traveling for work' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        agreementId: 'agreement-1',
        startDate: '2026-02-01',
        endDate: '2026-02-10',
        reason: 'Traveling for work',
      });
    });
  });

  it('shows the loading button state while submitting', () => {
    render(<SubletRequestForm onSubmit={vi.fn()} isSubmitting />);

    expect(
      screen.getByRole('button', { name: /submit request/i }),
    ).toBeDisabled();
  });
});
