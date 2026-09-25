import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { DeveloperWebhook } from '@/lib/developer-webhooks';

vi.mock('@/components/loading', () => ({
  Spinner: ({ label }: { label?: string }) =>
    React.createElement(
      'div',
      { 'aria-label': label ?? 'Loading' },
      label ?? 'Loading',
    ),
}));

import { WebhookForm } from '../WebhookForm';

const existingWebhook: DeveloperWebhook = {
  id: 'wh_1',
  ownerId: 'owner-1',
  label: 'Payments Collector',
  url: 'https://integrations.example.com/payments/webhook',
  events: ['payment.received', 'payment.failed'],
  method: 'POST',
  enabled: true,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  timeoutMs: 8000,
  retryPolicy: 'standard',
  authentication: 'api_key',
  authValue: 'api_key_live_demo',
  signingSecret: 'whsec_abc123',
  archived: false,
  headers: { 'X-Chioma-Source': 'developer-portal' },
  stats: { deliveries: 12, failedDeliveries: 0, successRate: 97 },
};

describe('WebhookForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<WebhookForm isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Create webhook')).not.toBeInTheDocument();
  });

  it('renders the create form with defaults when no webhook is given', () => {
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Create webhook' }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Payments collector')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Create webhook' }),
    ).toBeInTheDocument();
  });

  it('pre-fills the form fields when editing an existing webhook', () => {
    render(
      <WebhookForm
        isOpen
        webhook={existingWebhook}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Edit webhook')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Payments Collector')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'https://integrations.example.com/payments/webhook',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('X-Chioma-Source: developer-portal'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument();
  });

  it('shows a validation error when the webhook name is missing', () => {
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    expect(screen.getByText('Webhook name is required.')).toBeInTheDocument();
  });

  it('shows a validation error for an invalid URL', () => {
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Payments collector'), {
      target: { value: 'My webhook' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhooks/chioma'),
      { target: { value: 'not-a-url' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    expect(
      screen.getByText('Webhook URL must start with http:// or https://.'),
    ).toBeInTheDocument();
  });

  it('shows a validation error when no events are selected', () => {
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Payments collector'), {
      target: { value: 'My webhook' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhooks/chioma'),
      { target: { value: 'https://example.com/hook' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    expect(
      screen.getByText('Select at least one event subscription.'),
    ).toBeInTheDocument();
  });

  it('submits valid form values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Payments collector'), {
      target: { value: 'My webhook' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('https://example.com/webhooks/chioma'),
      { target: { value: 'https://example.com/hook' } },
    );
    fireEvent.click(screen.getByLabelText('payment.received'));

    fireEvent.click(screen.getByRole('button', { name: 'Create webhook' }));

    await screen.findByRole('button', { name: 'Create webhook' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'My webhook',
        url: 'https://example.com/hook',
        events: ['payment.received'],
        method: 'POST',
      }),
    );
  });

  it('reveals the authentication value field when an auth type is chosen', () => {
    render(<WebhookForm isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByText('Authentication value')).not.toBeInTheDocument();

    // The "Authentication" <label> is a visual sibling of the <select>, not
    // an accessible label association, so target it by DOM order instead:
    // [HTTP method, retry policy, authentication].
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], {
      target: { value: 'api_key' },
    });

    expect(screen.getByText('Authentication value')).toBeInTheDocument();
  });

  it('shows a "Saving..." label and disables actions while loading', () => {
    render(<WebhookForm isOpen loading onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<WebhookForm isOpen onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
