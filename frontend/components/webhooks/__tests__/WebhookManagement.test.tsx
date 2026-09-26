import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import toast from 'react-hot-toast';
import { WebhookManagement } from '../WebhookManagement';

describe('WebhookManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading and empty state', () => {
    render(<WebhookManagement />);

    expect(screen.getByText('Webhook Management')).toBeInTheDocument();
    expect(screen.getByText('No webhooks yet')).toBeInTheDocument();
    expect(
      screen.getByText('Select a webhook to view details'),
    ).toBeInTheDocument();
  });

  it('opens the create form when New Webhook is clicked', () => {
    render(<WebhookManagement />);

    fireEvent.click(screen.getByRole('button', { name: /New Webhook/i }));

    expect(screen.getByText('Create New Webhook')).toBeInTheDocument();
  });

  it('creates a webhook, shows a success toast and lists it', async () => {
    render(<WebhookManagement />);

    fireEvent.click(screen.getByRole('button', { name: /New Webhook/i }));

    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhook'),
      { target: { value: 'https://example.com/hook' } },
    );
    fireEvent.click(screen.getByLabelText('payment.received'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Webhook' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Webhook created successfully',
      );
    });

    expect(screen.queryByText('Create New Webhook')).not.toBeInTheDocument();
    expect(screen.getByText('https://example.com/hook')).toBeInTheDocument();
  });

  it('does not create a webhook when the URL is invalid', async () => {
    render(<WebhookManagement />);

    fireEvent.click(screen.getByRole('button', { name: /New Webhook/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Webhook' }));

    await waitFor(() => {
      expect(
        screen.getAllByText('Webhook URL is required').length,
      ).toBeGreaterThan(0);
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('selects a webhook and shows its detail panel', async () => {
    render(<WebhookManagement />);

    fireEvent.click(screen.getByRole('button', { name: /New Webhook/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhook'),
      { target: { value: 'https://example.com/hook' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Webhook' }));

    await waitFor(() =>
      expect(screen.getByText('https://example.com/hook')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText('https://example.com/hook'));

    expect(
      screen.queryByText('Select a webhook to view details'),
    ).not.toBeInTheDocument();
  });

  it('deletes a webhook after confirming the browser prompt', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<WebhookManagement />);

    fireEvent.click(screen.getByRole('button', { name: /New Webhook/i }));
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhook'),
      { target: { value: 'https://example.com/hook' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Webhook' }));

    await waitFor(() =>
      expect(screen.getByText('https://example.com/hook')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTitle('Delete'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Webhook deleted successfully',
      );
    });
    expect(
      screen.queryByText('https://example.com/hook'),
    ).not.toBeInTheDocument();
  });
});
