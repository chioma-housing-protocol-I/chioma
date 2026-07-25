/**
 * E2E-style integration tests for the booking and stays flow.
 * Covers: BookingStep1–4, the full multi-step booking wizard, and
 * confirmation routing to the user's trips/stays list.
 * Issue: #1250
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Stub availability / pricing endpoints ─────────────────────────────────

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// ─── Stub Next.js routing ─────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ propertyId: 'prop-42' })),
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

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

// ─── Stub toast ────────────────────────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ─── Component imports ────────────────────────────────────────────────────

import { BookingStep1 } from '@/components/booking/BookingStep1';
import { BookingStep2 } from '@/components/booking/BookingStep2';
import { BookingStep3 } from '@/components/booking/BookingStep3';
import { BookingStep4 } from '@/components/booking/BookingStep4';

// ─── Helpers ─────────────────────────────────────────────────────────────

const FUTURE_DATE = '2027-03-01';
const LATER_DATE = '2027-03-05';

// ─── BookingStep1 ─────────────────────────────────────────────────────────

describe('[E2E] Booking flow – Step 1: Date/guest selection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders check-in and check-out date inputs', () => {
    const { container } = render(
      React.createElement(BookingStep1, { onNext: vi.fn() }),
    );
    const dates = container.querySelectorAll('input[type="date"]');
    expect(dates).toHaveLength(2);
  });

  it('renders the guests selector', () => {
    render(React.createElement(BookingStep1, { onNext: vi.fn() }));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('disables Continue when dates are not yet set', () => {
    render(React.createElement(BookingStep1, { onNext: vi.fn() }));
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('enables Continue when valid check-in and check-out dates are set', () => {
    const { container } = render(
      React.createElement(BookingStep1, { onNext: vi.fn() }),
    );
    const [checkIn, checkOut] =
      container.querySelectorAll('input[type="date"]');
    fireEvent.change(checkIn, { target: { value: FUTURE_DATE } });
    fireEvent.change(checkOut, { target: { value: LATER_DATE } });
    expect(
      screen.getByRole('button', { name: /continue/i }),
    ).not.toBeDisabled();
  });

  it('keeps Continue disabled when check-out is before check-in', () => {
    const { container } = render(
      React.createElement(BookingStep1, { onNext: vi.fn() }),
    );
    const [checkIn, checkOut] =
      container.querySelectorAll('input[type="date"]');
    fireEvent.change(checkIn, { target: { value: LATER_DATE } });
    fireEvent.change(checkOut, { target: { value: FUTURE_DATE } });
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });

  it('calls onNext with the selected dates and guest count', () => {
    const onNext = vi.fn();
    const { container } = render(React.createElement(BookingStep1, { onNext }));
    const [checkIn, checkOut] =
      container.querySelectorAll('input[type="date"]');
    fireEvent.change(checkIn, { target: { value: FUTURE_DATE } });
    fireEvent.change(checkOut, { target: { value: LATER_DATE } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onNext).toHaveBeenCalledWith({
      checkIn: FUTURE_DATE,
      checkOut: LATER_DATE,
      guests: 2,
    });
  });
});

// ─── BookingStep2 ─────────────────────────────────────────────────────────

describe('[E2E] Booking flow – Step 2: Special requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the special requests textarea', () => {
    render(
      React.createElement(BookingStep2, {
        onNext: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByPlaceholderText(/early check-in/i)).toBeInTheDocument();
  });

  it('passes the special request text to onNext', () => {
    const onNext = vi.fn();
    render(
      React.createElement(BookingStep2, {
        onNext,
        onPrevious: vi.fn(),
      }),
    );
    fireEvent.change(screen.getByPlaceholderText(/early check-in/i), {
      target: { value: 'Please arrange early check-in.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onNext).toHaveBeenCalledWith({
      specialRequests: 'Please arrange early check-in.',
    });
  });

  it('calls onPrevious when Back is clicked', () => {
    const onPrevious = vi.fn();
    render(
      React.createElement(BookingStep2, {
        onNext: vi.fn(),
        onPrevious,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('allows continuing with no special request entered', () => {
    const onNext = vi.fn();
    render(
      React.createElement(BookingStep2, {
        onNext,
        onPrevious: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onNext).toHaveBeenCalledWith({ specialRequests: '' });
  });
});

// ─── BookingStep3 ─────────────────────────────────────────────────────────

describe('[E2E] Booking flow – Step 3: Payment method', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders payment options', () => {
    render(
      React.createElement(BookingStep3, {
        onNext: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByText(/credit \/ debit card/i)).toBeInTheDocument();
    expect(screen.getByText(/stellar wallet/i)).toBeInTheDocument();
  });

  it('selects card payment and calls onNext', () => {
    const onNext = vi.fn();
    render(
      React.createElement(BookingStep3, {
        onNext,
        onPrevious: vi.fn(),
      }),
    );
    fireEvent.click(
      screen.getByText(/credit \/ debit card/i).closest('button')!,
    );
    expect(onNext).toHaveBeenCalledWith({ paymentMethod: 'card' });
  });

  it('selects Stellar wallet payment and calls onNext', () => {
    const onNext = vi.fn();
    render(
      React.createElement(BookingStep3, {
        onNext,
        onPrevious: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByText(/stellar wallet/i).closest('button')!);
    expect(onNext).toHaveBeenCalledWith({ paymentMethod: 'stellar' });
  });

  it('calls onPrevious when Back is clicked', () => {
    const onPrevious = vi.fn();
    render(
      React.createElement(BookingStep3, {
        onNext: vi.fn(),
        onPrevious,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

// ─── BookingStep4 – review & confirm ─────────────────────────────────────

const reviewData = {
  checkIn: FUTURE_DATE,
  checkOut: LATER_DATE,
  guests: 2,
  specialRequests: 'Late check-out please',
  paymentMethod: 'card',
};

describe('[E2E] Booking flow – Step 4: Review & confirmation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a summary of the booking details', () => {
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByText(FUTURE_DATE, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/2 guests/i)).toBeInTheDocument();
    expect(screen.getByText('Late check-out please')).toBeInTheDocument();
  });

  it('shows the correct night count', () => {
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByText(/4 nights/i)).toBeInTheDocument();
  });

  it('renders "Credit / Debit Card" for card payment method', () => {
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByText(/credit \/ debit card/i)).toBeInTheDocument();
  });

  it('renders "Stellar Wallet (XLM)" for stellar payment method', () => {
    render(
      React.createElement(BookingStep4, {
        bookingData: { ...reviewData, paymentMethod: 'stellar' },
        onSubmit: vi.fn(),
        onPrevious: vi.fn(),
      }),
    );
    expect(screen.getByText(/stellar wallet \(xlm\)/i)).toBeInTheDocument();
  });

  it('calls onSubmit when Confirm Booking is clicked', () => {
    const onSubmit = vi.fn();
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit,
        onPrevious: vi.fn(),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state on the Confirm button while submitting', () => {
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit: vi.fn(),
        onPrevious: vi.fn(),
        isSubmitting: true,
      }),
    );
    expect(screen.getByRole('button', { name: /confirming/i })).toBeDisabled();
  });

  it('calls onPrevious when Back is clicked', () => {
    const onPrevious = vi.fn();
    render(
      React.createElement(BookingStep4, {
        bookingData: reviewData,
        onSubmit: vi.fn(),
        onPrevious,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

// ─── Full booking wizard end-to-end ────────────────────────────────────────

describe('[E2E] Booking flow – Full wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'booking-99' }),
    });
  });

  async function runFullBookingFlow() {
    // Lazy-import the page after mocks are installed
    const { default: BookingPage } =
      await import('@/app/stays/book/[propertyId]/page');
    const { container } = render(React.createElement(BookingPage));

    // Step 1 – dates & guests
    expect(screen.getByText(/when are you traveling/i)).toBeInTheDocument();
    const [checkIn, checkOut] =
      container.querySelectorAll('input[type="date"]');
    fireEvent.change(checkIn, { target: { value: FUTURE_DATE } });
    fireEvent.change(checkOut, { target: { value: LATER_DATE } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2 – special requests
    await waitFor(() =>
      expect(screen.getByText(/any special requests/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Step 3 – payment
    await waitFor(() =>
      expect(screen.getByText(/choose payment method/i)).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByText(/credit \/ debit card/i).closest('button')!,
    );

    // Step 4 – review
    await waitFor(() =>
      expect(screen.getByText(/review your booking/i)).toBeInTheDocument(),
    );
  }

  it('navigates through all four steps successfully', async () => {
    await runFullBookingFlow();
    expect(
      screen.getByRole('button', { name: /confirm booking/i }),
    ).toBeInTheDocument();
  });

  it('submits the booking and shows success toast', async () => {
    await runFullBookingFlow();
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Booking confirmed!'),
    );
  });

  it('redirects to /guest/trips after successful booking', async () => {
    await runFullBookingFlow();
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/guest/trips'));
  });

  it('shows an error toast when the booking API call fails', async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await runFullBookingFlow();
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Something went wrong. Please try again.',
      ),
    );
  });

  it('the booking appears under stays — confirmed via POST body', async () => {
    await runFullBookingFlow();
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/bookings');
    const body = JSON.parse(opts.body as string);
    expect(body.propertyId).toBe('prop-42');
    expect(body.checkIn).toBe(FUTURE_DATE);
    expect(body.checkOut).toBe(LATER_DATE);
  });
});
