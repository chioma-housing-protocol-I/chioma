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

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import NotificationsList from '../NotificationsList';

const rawNotifications = [
  {
    id: 'n1',
    title: 'Rent payment received',
    message: 'Tenant paid rent for Unit 4B.',
    isRead: false,
    type: 'payment_received',
    createdAt: '2024-05-01T10:00:00.000Z',
  },
  {
    id: 'n2',
    title: 'Maintenance request',
    message: 'A new maintenance request was filed.',
    isRead: true,
    type: 'maintenance_update',
    createdAt: '2024-05-02T10:00:00.000Z',
  },
];

function renderList(userId = 'landlord-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <NotificationsList userId={userId} />
    </QueryClientProvider>,
  );
}

describe('NotificationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGet.mockResolvedValue({ data: rawNotifications });
    mockPatch.mockResolvedValue({ data: {} });
    mockDelete.mockResolvedValue({ data: {} });
  });

  it('renders the fetched notifications with unread count', async () => {
    renderList();

    expect(
      await screen.findByText('Rent payment received'),
    ).toBeInTheDocument();
    // Newest-first: the maintenance notification is also the default
    // selected detail, so its title renders twice (list item + detail pane).
    expect(screen.getAllByText('Maintenance request').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });

  it('shows the empty state when there are no notifications', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderList();

    expect(
      await screen.findByText('No notifications found'),
    ).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network unreachable'));
    renderList();

    expect(await screen.findByText('Network unreachable')).toBeInTheDocument();
  });

  it('filters notifications by search text', async () => {
    renderList();

    await screen.findByText('Rent payment received');

    fireEvent.change(screen.getByPlaceholderText('Search notifications'), {
      target: { value: 'maintenance' },
    });

    expect(screen.queryByText('Rent payment received')).not.toBeInTheDocument();
    expect(screen.getAllByText('Maintenance request').length).toBeGreaterThan(
      0,
    );
  });

  it('marks a notification as read when selected', async () => {
    renderList();

    const unread = await screen.findByText('Rent payment received');
    fireEvent.click(unread);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/notifications/n1/read');
    });
  });

  it('marks all notifications as read', async () => {
    renderList();

    await screen.findByText('Rent payment received');
    fireEvent.click(screen.getByText('Mark all as read'));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  it('archives a notification, removing it from the list and persisting the id', async () => {
    renderList();

    await screen.findByText('Rent payment received');

    const article = screen
      .getByText('Rent payment received')
      .closest('article')!;
    fireEvent.click(within(article).getByText('Archive'));

    await waitFor(() => {
      expect(
        screen.queryByText('Rent payment received'),
      ).not.toBeInTheDocument();
    });

    const stored = JSON.parse(
      localStorage.getItem(
        'chioma_landlord_archived_notifications:landlord-1',
      ) ?? '[]',
    );
    expect(stored).toContain('n1');
  });

  it('deletes a notification', async () => {
    renderList();

    await screen.findByText('Rent payment received');
    const article = screen
      .getByText('Rent payment received')
      .closest('article')!;
    fireEvent.click(within(article).getByText('Delete'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/notifications/n1');
    });
  });
});
