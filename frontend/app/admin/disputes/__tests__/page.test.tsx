import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/disputes',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/store/authStore', () => ({
  useAuth: vi.fn(),
}));

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import AdminDisputesPage from '../page';

const rawDisputes = [
  {
    id: 1,
    disputeId: 'DSP-2026-004',
    status: 'OPEN',
    title: 'Glover Road, Ikoyi',
    description: 'Duplicate rent debit.',
  },
  {
    id: 2,
    disputeId: 'DSP-2026-002',
    status: 'OPEN',
    title: 'Admiralty Way, Block 4',
    description: 'Damage to kitchen cabinet.',
  },
];

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminDisputesPage />
    </QueryClientProvider>,
  );
}

describe('AdminDisputesPage bulk actions (#1558)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { role: 'admin' },
      loading: false,
    });
    mockGet.mockResolvedValue({ data: { disputes: rawDisputes } });
  });

  it('does not show the bulk action bar until a row is selected', async () => {
    renderPage();

    await screen.findByText('DSP-2026-004');

    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('selects rows, confirms, and resolves them via the bulk action', async () => {
    mockPatch.mockResolvedValue({ data: {} });
    renderPage();

    await screen.findByText('DSP-2026-004');
    await screen.findByText('DSP-2026-002');

    // Row checkboxes are icon-only buttons; select via the "Select all" header toggle.
    const selectAllButton = screen.getByTitle('Select all');
    fireEvent.click(selectAllButton);

    const selectedText = await screen.findByText('2 disputes selected');
    expect(selectedText).toBeInTheDocument();
    const bulkBar = selectedText.closest('div')!.parentElement as HTMLElement;

    fireEvent.click(within(bulkBar).getByText('Resolve'));

    expect(await screen.findByText('Resolve 2 disputes?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(2);
    });
    expect(mockPatch).toHaveBeenCalledWith('/admin/disputes/1', {
      status: 'RESOLVED',
      resolution: 'Resolved from admin dashboard (bulk action).',
    });
    expect(mockPatch).toHaveBeenCalledWith('/admin/disputes/2', {
      status: 'RESOLVED',
      resolution: 'Resolved from admin dashboard (bulk action).',
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Resolved 2 disputes');
    });

    // Selection clears and the bar disappears after a successful bulk action.
    await waitFor(() => {
      expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    });
  });

  it('reports a partial failure without losing the successful updates', async () => {
    mockPatch
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce(new Error('500 Internal Server Error'));
    renderPage();

    await screen.findByText('DSP-2026-004');
    await screen.findByText('DSP-2026-002');

    fireEvent.click(screen.getByTitle('Select all'));
    const selectedText = await screen.findByText('2 disputes selected');
    const bulkBar = selectedText.closest('div')!.parentElement as HTMLElement;
    fireEvent.click(within(bulkBar).getByText('Reject'));
    fireEvent.click(await screen.findByText('Confirm'));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        '1 succeeded, 1 failed to reject',
      );
    });
  });
});
