import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const getFreighterPublicKeyMock = vi.fn();
vi.mock('@/lib/stellar-auth', () => ({
  getFreighterPublicKey: () => getFreighterPublicKeyMock(),
}));

const mutateAsync = vi.fn();
vi.mock('@/lib/query/hooks/use-anchor-transactions', () => ({
  useCreateWithdrawal: () => ({ mutateAsync }),
}));

import WithdrawModal from '../WithdrawModal';

describe('WithdrawModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <WithdrawModal
        isOpen={false}
        onClose={vi.fn()}
        currency="USDC"
        balance={100}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the balance, currency and form fields when open', () => {
    render(
      <WithdrawModal
        isOpen
        onClose={vi.fn()}
        currency="USDC"
        balance={250.5}
      />,
    );

    expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
    expect(screen.getByText('Balance: 250.5 USDC')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('G...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('fills in the max amount when the Max button is clicked', () => {
    render(
      <WithdrawModal isOpen onClose={vi.fn()} currency="XLM" balance={42} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByPlaceholderText('0.00')).toHaveValue(42);
  });

  it('shows a validation error when submitting with empty fields', async () => {
    render(
      <WithdrawModal isOpen onClose={vi.fn()} currency="USDC" balance={100} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Withdrawal' }));

    expect(
      await screen.findByText('Please fill in all fields'),
    ).toBeInTheDocument();
  });

  it('shows an error when the amount exceeds the balance', async () => {
    render(
      <WithdrawModal isOpen onClose={vi.fn()} currency="USDC" balance={10} />,
    );

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByPlaceholderText('G...'), {
      target: { value: 'GABCDEF' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Withdrawal' }));

    expect(await screen.findByText('Insufficient balance')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('submits a withdrawal and shows the success state', async () => {
    getFreighterPublicKeyMock.mockResolvedValue('GWALLETADDR');
    mutateAsync.mockResolvedValue({ id: 'tx-1' });
    const onClose = vi.fn();

    render(
      <WithdrawModal isOpen onClose={onClose} currency="USDC" balance={100} />,
    );

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByPlaceholderText('G...'), {
      target: { value: 'GDESTADDR' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Withdrawal' }));

    expect(await screen.findByText('Withdrawal Initiated')).toBeInTheDocument();

    expect(mutateAsync).toHaveBeenCalledWith({
      amount: 25,
      currency: 'USDC',
      destination: 'GDESTADDR',
      walletAddress: 'GWALLETADDR',
    });
  });

  it('shows an error message when the wallet connection fails', async () => {
    getFreighterPublicKeyMock.mockRejectedValue(
      new Error('Please allow access to Freighter to continue.'),
    );

    render(
      <WithdrawModal isOpen onClose={vi.fn()} currency="USDC" balance={100} />,
    );

    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByPlaceholderText('G...'), {
      target: { value: 'GDESTADDR' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Withdrawal' }));

    expect(
      await screen.findByText('Please allow access to Freighter to continue.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked while idle', () => {
    const onClose = vi.fn();
    const { container } = render(
      <WithdrawModal isOpen onClose={onClose} currency="USDC" balance={100} />,
    );

    const backdrop = container.querySelector('.absolute.inset-0')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
