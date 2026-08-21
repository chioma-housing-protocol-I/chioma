/**
 * Unit/integration tests for PaymentModal.
 * Issue: #1551 — Payment/escrow UI components have zero test coverage
 *
 * Covers: successful payment submission, client-side validation failures,
 * and a simulated API failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) =>
    React.createElement('a', props, props.children),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock BaseModal — render children + footer when isOpen, null when closed
vi.mock('@/components/modals/BaseModal', () => ({
  BaseModal: ({
    isOpen,
    title,
    subtitle,
    children,
    footer,
  }: {
    isOpen: boolean;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    onClose?: () => void;
  }) =>
    isOpen
      ? React.createElement(
          'div',
          { 'data-testid': 'base-modal' },
          React.createElement('h2', { 'data-testid': 'modal-title' }, title),
          subtitle
            ? React.createElement('p', { 'data-testid': 'modal-subtitle' }, subtitle)
            : null,
          React.createElement('div', { 'data-testid': 'modal-children' }, children),
          footer
            ? React.createElement('div', { 'data-testid': 'modal-footer' }, footer)
            : null,
        )
      : null,
}));

// Mock lucide-react icons — simple span placeholders
vi.mock('lucide-react', () => ({
  CreditCard: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-credit-card', className, 'data-size': size }),
  DollarSign: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-dollar', className, 'data-size': size }),
  Calendar: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-calendar', className, 'data-size': size }),
  Building: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-building', className, 'data-size': size }),
  CheckCircle2: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-check-circle', className, 'data-size': size }),
  Trash2: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-trash', className, 'data-size': size }),
  Plus: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-plus', className, 'data-size': size }),
  Loader2: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-loader', className, 'data-size': size }),
  X: ({ className, size }: { className?: string; size?: number }) =>
    React.createElement('span', { 'data-testid': 'icon-x', className, 'data-size': size }),
}));

// Mock formatCurrency
vi.mock('@/lib/utils/format', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}));

// Mock use-payments hooks
const mockUsePaymentMethods = vi.fn();
const mockCreatePaymentMethodMutate = vi.fn();
const mockDeletePaymentMethodMutate = vi.fn();

vi.mock('@/lib/query/hooks/use-payments', () => ({
  usePaymentMethods: (...args: unknown[]) => mockUsePaymentMethods(...args),
  useCreatePaymentMethod: () => ({ mutateAsync: mockCreatePaymentMethodMutate, isPending: false }),
  useDeletePaymentMethod: () => ({ mutateAsync: mockDeletePaymentMethodMutate, isPending: false }),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import toast from 'react-hot-toast';
import { PaymentModal } from '../PaymentModal';

// ─── Test data ───────────────────────────────────────────────────────────────

const SAVED_CARD = {
  id: 1,
  paymentType: 'CREDIT_CARD',
  lastFour: '4242',
  expiryDate: '2027-08-28',
  isDefault: true,
  metadata: { cardholderName: 'Test User' },
};

const SAVED_BANK = {
  id: 2,
  paymentType: 'BANK_TRANSFER',
  lastFour: '6789',
  isDefault: false,
  metadata: { bankName: 'Test Bank', routingNumber: '123456789' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface PaymentSubmissionData {
  agreementId: string;
  amount: number;
  paymentMethod: 'card' | 'bank_transfer' | 'crypto';
  paymentMethodId?: string;
  dueDate?: string;
  description?: string;
}

function renderModal(props: Partial<React.ComponentProps<typeof PaymentModal>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn<(...args: [PaymentSubmissionData]) => Promise<void>>();
  const utils = render(
    <PaymentModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onClose, onSubmit, ...utils };
}

function getPayNowButton() {
  return screen.getByRole('button', { name: /pay now/i });
}

function getCancelButton() {
  return screen.getByRole('button', { name: /cancel/i });
}

function getAmountInput() {
  return screen.getByPlaceholderText('0.00');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty saved methods
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the modal title, amount input, and payment method categories when open', () => {
    renderModal();
    expect(screen.getByTestId('base-modal')).toBeInTheDocument();
    expect(screen.getByText('Make Payment')).toBeInTheDocument();
    expect(getAmountInput()).toBeInTheDocument();
    expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('Cryptocurrency')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PaymentModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
  });

  // ── Payment Method Selection ──────────────────────────────────────────────

  it('shows "No saved payment methods" when no methods exist', () => {
    renderModal();
    expect(screen.getByText('No saved payment methods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add payment method/i })).toBeInTheDocument();
  });

  it('shows saved credit cards when card category is selected', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [SAVED_CARD], isLoading: false });
    renderModal();
    // The card should be displayed in the saved methods list
    expect(screen.getByText(/•••• •••• •••• 4242/)).toBeInTheDocument();
    // Default badge should be visible
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('switches to bank transfer and shows saved bank accounts', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [SAVED_CARD, SAVED_BANK], isLoading: false });
    renderModal();
    // Click Bank Transfer category
    fireEvent.click(screen.getByText('Bank Transfer'));
    expect(screen.getByText(/Test Bank/)).toBeInTheDocument();
  });

  it('shows crypto disabled message when crypto category is selected', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });
    renderModal();
    fireEvent.click(screen.getByText('Cryptocurrency'));
    expect(screen.getByText(/Cryptocurrency payments are disabled/i)).toBeInTheDocument();
  });

  // ── Add Payment Method Form ───────────────────────────────────────────────

  it('shows card add form fields when "Add New" is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));
    expect(screen.getByPlaceholderText('Cardholder Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Card Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument();
  });

  it('validates card number when adding a credit card', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));
    // Click Save Method without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /save method/i }));
    expect(toast.error).toHaveBeenCalledWith('Please enter a valid card number');
  });

  it('validates bank account fields when adding a bank account', () => {
    renderModal();
    // Switch to bank transfer
    fireEvent.click(screen.getByText('Bank Transfer'));
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));
    // Click Save Method without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /save method/i }));
    expect(toast.error).toHaveBeenCalledWith('Please enter a valid account number');
  });

  it('adds a credit card successfully', async () => {
    mockCreatePaymentMethodMutate.mockResolvedValue(undefined);
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));

    fireEvent.change(screen.getByPlaceholderText('Cardholder Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Card Number'), { target: { value: '4111111111111111' } });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), { target: { value: '12/28' } });
    fireEvent.click(screen.getByRole('button', { name: /save method/i }));

    await waitFor(() => {
      expect(mockCreatePaymentMethodMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentType: 'CREDIT_CARD',
          lastFour: '1111',
          expiryDate: expect.stringContaining('2028-12-28'),
        }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Payment card added successfully');
  });

  it('adds a bank account successfully', async () => {
    mockCreatePaymentMethodMutate.mockResolvedValue(undefined);
    renderModal();
    // Switch to bank transfer
    fireEvent.click(screen.getByText('Bank Transfer'));
    fireEvent.click(screen.getByRole('button', { name: /add new/i }));

    fireEvent.change(screen.getByPlaceholderText('Bank Name'), { target: { value: 'Chase Bank' } });
    fireEvent.change(screen.getByPlaceholderText('Account Number'), { target: { value: '123456789' } });
    fireEvent.change(screen.getByPlaceholderText('Routing Number'), { target: { value: '021000021' } });
    fireEvent.click(screen.getByRole('button', { name: /save method/i }));

    await waitFor(() => {
      expect(mockCreatePaymentMethodMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentType: 'BANK_TRANSFER',
          lastFour: '6789',
          metadata: expect.objectContaining({
            bankName: 'Chase Bank',
            routingNumber: '021000021',
          }),
        }),
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Bank account registered successfully');
  });

  it('deletes a saved payment method', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [SAVED_CARD], isLoading: false });
    mockDeletePaymentMethodMutate.mockResolvedValue({ success: true });
    renderModal();

    // Click the delete button (trash icon)
    fireEvent.click(screen.getByTestId('icon-trash'));

    await waitFor(() => {
      expect(mockDeletePaymentMethodMutate).toHaveBeenCalledWith(SAVED_CARD.id);
    });
    expect(toast.success).toHaveBeenCalledWith('Payment method removed');
  });

  // ── Payment Submission ────────────────────────────────────────────────────

  it('shows "select or add a payment method" when no method is selected and add form is open', async () => {
    renderModal({ amount: 100 });
    // No saved methods → no selectedMethodId
    // Open add form — this makes Pay Now enabled (showAddForm = true)
    fireEvent.click(screen.getByRole('button', { name: /add payment method/i }));
    // Enter amount so the button is enabled (amount > 0)
    fireEvent.change(getAmountInput(), { target: { value: '100' } });
    // Click Pay Now while still in add form with no selectedMethodId
    fireEvent.click(getPayNowButton());

    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
        'Please select or add a payment method first',
      );
    });
  });

  it('submits payment successfully with a saved card method', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [SAVED_CARD], isLoading: false });
    const { onSubmit, onClose } = renderModal({ amount: 100 });

    // Enter a valid amount
    fireEvent.change(getAmountInput(), { target: { value: '200' } });
    // Click Pay Now
    fireEvent.click(getPayNowButton());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 200,
          paymentMethod: 'card',
          paymentMethodId: '1',
        }),
      );
    });

    expect(toast.success).toHaveBeenCalledWith('Payment processed successfully');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error toast when payment submission fails', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [SAVED_CARD], isLoading: false });
    const { onSubmit } = renderModal({ amount: 100 });
    onSubmit.mockRejectedValue(new Error('Insufficient funds'));

    fireEvent.change(getAmountInput(), { target: { value: '200' } });
    fireEvent.click(getPayNowButton());

    await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Insufficient funds');
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────────

  it('calls onClose when Cancel button is clicked', () => {
    const { onClose } = renderModal();
    fireEvent.click(getCancelButton());
    expect(onClose).toHaveBeenCalled();
  });
});