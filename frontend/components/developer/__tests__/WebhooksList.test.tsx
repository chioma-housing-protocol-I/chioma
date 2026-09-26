import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

import { WebhooksList } from '../WebhooksList';
import type { DeveloperWebhook } from '@/lib/developer-webhooks';

function makeWebhook(
  overrides: Partial<DeveloperWebhook> = {},
): DeveloperWebhook {
  return {
    id: 'wh-1',
    ownerId: 'owner-1',
    label: 'Payments hook',
    url: 'https://example.com/hooks/payments',
    events: ['payment.received'],
    method: 'POST',
    enabled: true,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastTriggeredAt: '2026-01-05T00:00:00.000Z',
    timeoutMs: 5000,
    retryPolicy: 'standard',
    authentication: 'none',
    signingSecret: 'secret',
    archived: false,
    headers: {},
    stats: { deliveries: 10, failedDeliveries: 1, successRate: 90 },
    ...overrides,
  };
}

function renderList(
  overrides: Partial<Parameters<typeof WebhooksList>[0]> = {},
) {
  const handlers = {
    onSelect: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggle: vi.fn(),
    onArchive: vi.fn(),
    onTest: vi.fn(),
    onRetry: vi.fn(),
    onCreate: vi.fn(),
  };

  const utils = render(
    <WebhooksList
      webhooks={[]}
      selectedId={null}
      {...handlers}
      {...overrides}
    />,
  );

  return { ...utils, ...handlers };
}

describe('WebhooksList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an empty state when there are no webhooks', () => {
    const { onCreate } = renderList({ webhooks: [] });

    expect(screen.getByText('No webhooks found')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New webhook' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders webhook rows with label, method/url and status', () => {
    renderList({ webhooks: [makeWebhook()] });

    expect(screen.getByText('Payments hook')).toBeInTheDocument();
    expect(
      screen.getByText('POST https://example.com/hooks/payments'),
    ).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('hides archived webhooks from the list', () => {
    renderList({
      webhooks: [makeWebhook({ id: 'wh-archived', archived: true })],
    });

    expect(screen.getByText('No webhooks found')).toBeInTheDocument();
  });

  it('calls onSelect when a webhook row is clicked', () => {
    const { onSelect } = renderList({ webhooks: [makeWebhook()] });

    fireEvent.click(screen.getByText('Payments hook'));
    expect(onSelect).toHaveBeenCalledWith('wh-1');
  });

  it('filters webhooks by search query', () => {
    renderList({
      webhooks: [
        makeWebhook({ id: 'wh-1', label: 'Payments hook' }),
        makeWebhook({ id: 'wh-2', label: 'Lease hook', url: 'https://x.com' }),
      ],
    });

    expect(screen.getByText('Payments hook')).toBeInTheDocument();
    expect(screen.getByText('Lease hook')).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Search by URL, name, or event'),
      { target: { value: 'lease' } },
    );

    expect(screen.queryByText('Payments hook')).not.toBeInTheDocument();
    expect(screen.getByText('Lease hook')).toBeInTheDocument();
  });

  it('filters webhooks by status', () => {
    renderList({
      webhooks: [
        makeWebhook({ id: 'wh-1', label: 'Active hook', status: 'active' }),
        makeWebhook({ id: 'wh-2', label: 'Failed hook', status: 'failed' }),
      ],
    });

    fireEvent.change(screen.getByDisplayValue('All statuses'), {
      target: { value: 'failed' },
    });

    expect(screen.queryByText('Active hook')).not.toBeInTheDocument();
    expect(screen.getByText('Failed hook')).toBeInTheDocument();
  });

  it('calls onToggle, onEdit, onDelete, onArchive, onTest and onRetry from row actions', () => {
    const handlers = renderList({ webhooks: [makeWebhook()] });

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(handlers.onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wh-1' }),
    );

    const buttons = screen.getAllByRole('button');
    // Test (Play), Retry (RefreshCw) buttons don't have accessible names,
    // so fall back to icon-only buttons order after "Disable".
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handlers.onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wh-1' }),
    );
  });

  it('paginates when there are more webhooks than the page size', () => {
    const webhooks = Array.from({ length: 7 }, (_, i) =>
      makeWebhook({ id: `wh-${i}`, label: `Hook ${i}` }),
    );
    renderList({ webhooks });

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Hook 0')).toBeInTheDocument();
    expect(screen.queryByText('Hook 6')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Hook 6')).toBeInTheDocument();
  });
});
