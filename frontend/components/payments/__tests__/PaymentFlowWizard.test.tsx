import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

vi.mock('@/components/blockchain/BlockchainStatusBadge', () => ({
  BlockchainStatusBadge: () => <span data-testid="status-badge" />,
}));

vi.mock('@/components/blockchain/TransactionSigningModal', () => ({
  TransactionSigningModal: ({
    isOpen,
    transactionXdr,
    onSigned,
    onClose,
  }: {
    isOpen: boolean;
    transactionXdr: string;
    onSigned?: (xdr: string) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="signing-modal">
        <span data-testid="signing-modal-xdr">{transactionXdr}</span>
        <button onClick={() => onSigned?.(transactionXdr)}>
          Confirm sign
        </button>
        <button onClick={onClose}>Close modal</button>
      </div>
    ) : null,
}));

import { PaymentFlowWizard } from '../PaymentFlowWizard';

describe('PaymentFlowWizard', () => {
  let prepareTransaction: ReturnType<typeof vi.fn>;
  let onSigned: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    prepareTransaction = vi.fn().mockResolvedValue('UNSIGNED_XDR_ABC');
    onSigned = vi.fn();
    onError = vi.fn();
  });

  function renderWizard() {
    return render(
      <PaymentFlowWizard
        prepareTransaction={prepareTransaction}
        onSigned={onSigned}
        onError={onError}
      />,
    );
  }

  describe('step-by-step progression', () => {
    it('starts on the amount step with Continue disabled until an amount is entered', () => {
      renderWizard();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });

      expect(continueButton).not.toBeDisabled();
    });

    it('advances to the review step showing the entered amount and memo', () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.change(screen.getByPlaceholderText('Invoice #…'), {
        target: { value: 'Rent for June' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText(/25 XLM/)).toBeInTheDocument();
      expect(screen.getByText('Rent for June')).toBeInTheDocument();
    });

    it('calls prepareTransaction and opens the signing modal when review is confirmed', async () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await waitFor(() => {
        expect(prepareTransaction).toHaveBeenCalledWith({
          amount: '25',
          memo: '',
        });
      });
      expect(await screen.findByTestId('signing-modal')).toBeInTheDocument();
      expect(screen.getByTestId('signing-modal-xdr')).toHaveTextContent(
        'UNSIGNED_XDR_ABC',
      );
    });

    it('calls onSigned with the signed xdr and closes the modal after signing', async () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await screen.findByTestId('signing-modal');
      fireEvent.click(screen.getByRole('button', { name: /confirm sign/i }));

      expect(onSigned).toHaveBeenCalledWith('UNSIGNED_XDR_ABC');
      expect(screen.queryByTestId('signing-modal')).not.toBeInTheDocument();
    });
  });

  describe('back/forward navigation', () => {
    it('returns from the review step to the amount step via Back, preserving the entered amount', () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '40' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      expect(screen.getByText(/40 XLM/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

      expect(screen.getByPlaceholderText('0.00')).toHaveValue('40');
      expect(screen.queryByText(/40 XLM/)).not.toBeInTheDocument();
    });

    it('does not advance past the amount step when the amount is blank', () => {
      renderWizard();

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.queryByText(/prepare & sign/i)).not.toBeInTheDocument();
    });

    it('returning to review from a closed signing modal keeps the built transaction available', async () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await screen.findByTestId('signing-modal');
      fireEvent.click(screen.getByRole('button', { name: /close modal/i }));

      expect(screen.queryByTestId('signing-modal')).not.toBeInTheDocument();
      expect(screen.getByText(/25 XLM/)).toBeInTheDocument();
    });
  });

  describe('failure at a non-final step', () => {
    it('calls onError and stays on the review step when prepareTransaction rejects', async () => {
      prepareTransaction.mockRejectedValue(new Error('RPC unreachable'));
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
      expect(onError.mock.calls[0][0].message).toBe('RPC unreachable');
      expect(screen.queryByTestId('signing-modal')).not.toBeInTheDocument();
      // Still on the review step, not silently reset to amount.
      expect(screen.getByText(/25 XLM/)).toBeInTheDocument();
    });

    it('wraps a non-Error rejection from prepareTransaction in an Error', async () => {
      prepareTransaction.mockRejectedValue('boom');
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
      expect(onError.mock.calls[0][0].message).toBe(
        'Could not build payment',
      );
    });

    it('re-enables the Prepare & sign button after a failure so the user can retry', async () => {
      prepareTransaction.mockRejectedValueOnce(new Error('transient'));
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText('0.00'), {
        target: { value: '25' },
      });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
      fireEvent.click(screen.getByRole('button', { name: /prepare & sign/i }));

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

      const retryButton = screen.getByRole('button', {
        name: /prepare & sign/i,
      });
      expect(retryButton).not.toBeDisabled();
    });
  });
});
