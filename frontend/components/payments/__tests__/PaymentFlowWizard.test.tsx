/**
 * Unit/integration tests for PaymentFlowWizard.
 * Issue: #1551 — Payment/escrow UI components have zero test coverage
 *
 * Covers: step-by-step progression, back/forward navigation, and a
 * failure at a non-final step.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) =>
    React.createElement('a', props, props.children),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronRight: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-chevron', className, 'data-size': size }),
  Loader2: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-loader', className, 'data-size': size }),
}));

// Mock BlockchainStatusBadge — simple placeholder
vi.mock('@/components/blockchain/BlockchainStatusBadge', () => ({
  BlockchainStatusBadge: ({ variant }: { variant?: string }) =>
    React.createElement('span', { 'data-testid': 'blockchain-status', 'data-variant': variant }),
}));

// Mock TransactionSigningModal — verify xdr passthrough and signing callback
const mockSigningModal = vi.fn();
vi.mock('@/components/blockchain/TransactionSigningModal', () => ({
  TransactionSigningModal: (props: {
    isOpen: boolean;
    onClose: () => void;
    transactionXdr: string;
    title?: string;
    onSigned?: (signedXdr: string) => void;
  }) => {
    mockSigningModal(props);
    if (!props.isOpen) return null;
    return React.createElement(
      'div',
      { 'data-testid': 'signing-modal' },
      React.createElement('p', null, props.title || 'Sign transaction'),
      React.createElement('p', { 'data-testid': 'signing-xdr' }, props.transactionXdr),
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => props.onSigned?.('mock-signed-xdr'),
        },
        'Mock Sign',
      ),
    );
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { PaymentFlowWizard } from '../PaymentFlowWizard';

// ─── Test data ───────────────────────────────────────────────────────────────

const MOCK_XDR = 'AAAAAgAAAABjYW5vbmljYWw';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderWizard(
  overrides: Partial<{
    title: string;
    assetLabel: string;
    prepareTransaction: (params: { amount: string; memo: string }) => Promise<string>;
    onSigned: (signedXdr: string) => void;
    onError: (error: Error) => void;
  }> = {},
) {
  const onSigned = overrides.onSigned ?? vi.fn<(...args: [string]) => void>();
  const onError = overrides.onError ?? vi.fn<(...args: [Error]) => void>();

  const utils = render(
    <PaymentFlowWizard
      prepareTransaction={
        overrides.prepareTransaction ?? mockPrepareTransaction
      }
      onSigned={onSigned}
      onError={onError}
      {...overrides}
    />,
  );
  return {
    prepareTransaction:
      overrides.prepareTransaction ?? mockPrepareTransaction,
    onSigned,
    onError,
    ...utils,
  };
}

function getContinueButton() {
  return screen.getByRole('button', { name: /continue/i });
}

function getAmountInput() {
  return screen.getByPlaceholderText('0.00');
}

function getMemoInput() {
  return screen.getByPlaceholderText(/invoice/i);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const mockPrepareTransaction = vi
  .fn<(...args: [{ amount: string; memo: string }]) => Promise<string>>()
  .mockResolvedValue(MOCK_XDR);

describe('PaymentFlowWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrepareTransaction.mockResolvedValue(MOCK_XDR);
  });

  // ── Amount Step ──────────────────────────────────────────────────────────

  it('renders the amount step with title and network badge', () => {
    renderWizard({ title: 'Send rent' });
    expect(screen.getByText('Send rent')).toBeInTheDocument();
    expect(getAmountInput()).toBeInTheDocument();
    expect(getMemoInput()).toBeInTheDocument();
    expect(screen.getByTestId('blockchain-status')).toBeInTheDocument();
  });

  it('disables Continue when amount is empty', () => {
    renderWizard();
    expect(getContinueButton()).toHaveProperty('disabled', true);
  });

  it('enables Continue once an amount is entered', () => {
    renderWizard();
    fireEvent.change(getAmountInput(), { target: { value: '50' } });
    expect(getContinueButton()).toHaveProperty('disabled', false);
  });

  it('stays on amount step when Continue is clicked with blank amount', () => {
    renderWizard();
    // Continue disabled; clicking does nothing
    fireEvent.click(getContinueButton());
    expect(screen.getByText(/amount \(xlm\)/i)).toBeInTheDocument();
    // Review step's signature button should NOT be present
    expect(
      screen.queryByRole('button', { name: /prepare & sign/i }),
    ).not.toBeInTheDocument();
  });

  // ── Step Progression ─────────────────────────────────────────────────────

  it('shows review step with entered amount and memo after Continue', () => {
    renderWizard();
    fireEvent.change(getAmountInput(), { target: { value: '500' } });
    fireEvent.change(getMemoInput(), { target: { value: 'June rent' } });
    fireEvent.click(getContinueButton());

    // Review step: amount and memo shown in the summary
    expect(screen.getByText('500 XLM')).toBeInTheDocument();
    expect(screen.getByText('June rent')).toBeInTheDocument();
    // Prepare & sign button present
    expect(screen.getByRole('button', { name: /prepare & sign/i })).toBeInTheDocument();
  });

  it('shows em-dash memo in review when memo was left blank', () => {
    renderWizard();
    fireEvent.change(getAmountInput(), { target: { value: '100' } });
    fireEvent.click(getContinueButton());
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('navigates back to amount step preserving entered values', () => {
    renderWizard();
    fireEvent.change(getAmountInput(), { target: { value: '750' } });
    fireEvent.change(getMemoInput(), { target: { value: 'Keep memo' } });
    fireEvent.click(getContinueButton());

    // Go back
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/amount \(xlm\)/i)).toBeInTheDocument();
    // Values preserved
    expect(getAmountInput()).toHaveValue('750');
    expect(getMemoInput()).toHaveValue('Keep memo');
  });

  // ── Prepare & Sign ───────────────────────────────────────────────────────

  it('calls prepareTransaction with trimmed amount and memo', async () => {
    const { prepareTransaction } = renderWizard();
    fireEvent.change(getAmountInput(), { target: { value: '  250  ' } });
    fireEvent.change(getMemoInput(), { target: { value: '  Sept  ' } });
    fireEvent.click(getContinueButton());
    fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

    await waitFor(() => {
      expect(prepareTransaction).toHaveBeenCalledWith({
        amount: '250',
        memo: 'Sept',
      });
    });
  });

  it('opens the signing modal with the built XDR after successful prepare', async () => {
    renderWizard();
    mockPrepareTransaction.mockResolvedValue(MOCK_XDR);
    fireEvent.change(getAmountInput(), { target: { value: '100' } });
    fireEvent.click(getContinueButton());
    fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

    await waitFor(() => {
      expect(screen.getByTestId('signing-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('signing-xdr')).toHaveTextContent(MOCK_XDR);
  });

  it('calls onSigned with the signed XDR when modal signs', async () => {
    const { onSigned } = renderWizard();
    mockPrepareTransaction.mockResolvedValue(MOCK_XDR);
    fireEvent.change(getAmountInput(), { target: { value: '100' } });
    fireEvent.click(getContinueButton());
    fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

    await waitFor(() => {
      expect(screen.getByTestId('signing-modal')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /mock sign/i }));

    expect(onSigned).toHaveBeenCalledWith('mock-signed-xdr');
  });

  it('shows an error when prepareTransaction fails (failure at non-final step)', async () => {
    const prepareTransaction = vi.fn().mockRejectedValue(new Error('Network error building XDR'));
    const onError = vi.fn();
    renderWizard({ prepareTransaction, onError });

    fireEvent.change(getAmountInput(), { target: { value: '100' } });
    fireEvent.click(getContinueButton());
    fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network error building XDR' }),
      );
    });
    // Wizard stays on the review step after failure
    expect(screen.getByRole('button', { name: /prepare & sign/i })).toBeInTheDocument();
    expect(screen.queryByTestId('signing-modal')).not.toBeInTheDocument();
  });

  it('passes a non-Error rejection to onError as a generic Error', async () => {
    const prepareTransaction = vi.fn().mockRejectedValue('plain string failure');
    const onError = vi.fn();
    renderWizard({ prepareTransaction, onError });

    fireEvent.change(getAmountInput(), { target: { value: '50' } });
    fireEvent.click(getContinueButton());
    fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Could not build payment' }),
      );
    });
  });

  // ── Step Indicators ──────────────────────────────────────────────────────

  it('shows all three step labels in the stepper', () => {
    renderWizard();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Sign')).toBeInTheDocument();
  });
});