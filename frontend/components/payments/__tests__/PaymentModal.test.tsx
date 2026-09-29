import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockUsePaymentMethods = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/lib/query/hooks/use-payments', () => ({
  usePaymentMethods: () => mockUsePaymentMethods(),
  useCreatePaymentMethod: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useDeletePaymentMethod: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import { PaymentModal } from '../PaymentModal';

const cardMethod = {
  id: 1,
  userId: 'u1',
  paymentType: 'CREDIT_CARD',
  lastFour: '4242',
  expiryDate: '2030-01-28',
  isDefault: true,
  metadata: {},
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function setDefaultMethods() {
  mockUsePaymentMethods.mockReturnValue({
    data: [cardMethod],
    isLoading: false,
  });
}

describe('PaymentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultMethods();
    mockCreateMutateAsync.mockResolvedValue(undefined);
    mockDeleteMutateAsync.mockResolvedValue(undefined);
  });

  it('does not render modal content when closed', () => {
    render(<PaymentModal isOpen={false} onClose={vi.fn()} amount={100} />);

    expect(screen.queryByText('Make Payment')).not.toBeInTheDocument();
  });

  it('renders the payment amount and saved card when open', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        agreementId="agreement-1"
        amount={500}
      />,
    );

    expect(screen.getByText('Make Payment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument();
  });

  it('shows a disabled notice and blocks submission when crypto is selected', () => {
    const onSubmit = vi.fn();
    render(
      <PaymentModal
        isOpen={true}
        onClose={vi.fn()}
        amount={500}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByText('Cryptocurrency'));

    expect(
      screen.getByText('Cryptocurrency payments are disabled'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pay Now').closest('button')).toBeDisabled();
  });

  it('submits the payment with the selected saved method', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <PaymentModal
        isOpen={true}
        onClose={onClose}
        agreementId="agreement-1"
        amount={500}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByText('Pay Now'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agreement-1',
          amount: 500,
          paymentMethod: 'card',
          paymentMethodId: '1',
        }),
      );
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      'Payment processed successfully',
    );
  });

  it('shows the empty state and add-method form for bank transfer with no saved methods', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });

    render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

    fireEvent.click(screen.getByText('Bank Transfer'));

    expect(screen.getByText('No saved payment methods')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Add Payment Method'));

    expect(screen.getByPlaceholderText('Bank Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Account Number')).toBeInTheDocument();
  });

  it('validates the new card form before creating a payment method', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });

    render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

    fireEvent.click(screen.getByText('Add Payment Method'));
    fireEvent.click(screen.getByText('Save Method'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        'Please enter a valid card number',
      );
    });
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('creates a new card payment method with valid input', async () => {
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });

    render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

    fireEvent.click(screen.getByText('Add Payment Method'));

    fireEvent.change(screen.getByPlaceholderText('Cardholder Name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('Card Number'), {
      target: { value: '4111111111111234' },
    });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
      target: { value: '12/30' },
    });

    fireEvent.click(screen.getByText('Save Method'));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentType: 'CREDIT_CARD',
          lastFour: '1234',
        }),
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      'Payment card added successfully',
    );
  });

  describe('simulated API failure (#1551)', () => {
    it('shows an error toast and keeps the modal open when the payment submission API call fails', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Card declined'));
      const onClose = vi.fn();
      render(
        <PaymentModal
          isOpen={true}
          onClose={onClose}
          agreementId="agreement-1"
          amount={500}
          onSubmit={onSubmit}
        />,
      );

      fireEvent.click(screen.getByText('Pay Now'));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith('Card declined');
      });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('falls back to a generic error message when the payment submission API rejects without an Error', async () => {
      const onSubmit = vi.fn().mockRejectedValue('gateway timeout');
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          amount={500}
          onSubmit={onSubmit}
        />,
      );

      fireEvent.click(screen.getByText('Pay Now'));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith('Payment failed');
      });
    });

    it('re-enables Pay Now after a failed submission so the user can retry', async () => {
      const onSubmit = vi.fn().mockRejectedValueOnce(new Error('transient'));
      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          amount={500}
          onSubmit={onSubmit}
        />,
      );

      fireEvent.click(screen.getByText('Pay Now'));

      await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
      expect(screen.getByText('Pay Now').closest('button')).not.toBeDisabled();
    });

    it('shows an error toast when the create-payment-method API call fails', async () => {
      mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });
      mockCreateMutateAsync.mockRejectedValue(new Error('Server error'));

      render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

      fireEvent.click(screen.getByText('Add Payment Method'));
      fireEvent.change(screen.getByPlaceholderText('Card Number'), {
        target: { value: '4111111111111234' },
      });
      fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
        target: { value: '12/30' },
      });
      fireEvent.click(screen.getByText('Save Method'));

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(
          'Failed to save credit card',
        );
      });
    });

    it('shows an error toast when the delete-payment-method API call fails', async () => {
      mockDeleteMutateAsync.mockRejectedValue(new Error('Server error'));

      render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

      const removeButton = screen.getByTitle('Remove payment method');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith(
          'Failed to delete payment method',
        );
      });
    });
  });

  it('requires a payment method to be selected before Pay Now is enabled (#1551)', () => {
    mockUsePaymentMethods.mockReturnValue({ data: [], isLoading: false });

    render(<PaymentModal isOpen={true} onClose={vi.fn()} amount={500} />);

    expect(screen.getByText('Pay Now').closest('button')).toBeDisabled();
  });
});
