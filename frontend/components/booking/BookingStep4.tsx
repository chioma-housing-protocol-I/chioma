'use client';

import { CalendarDays, CreditCard, Loader2, MessageSquare, Users } from 'lucide-react';

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests: string;
  paymentMethod: string;
}

interface Props {
  bookingData: BookingData;
  onSubmit: () => void;
  onPrevious: () => void;
  isSubmitting?: boolean;
}

export function BookingStep4({
  bookingData,
  onSubmit,
  onPrevious,
  isSubmitting,
}: Props) {
  const nights =
    bookingData.checkIn && bookingData.checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(bookingData.checkOut).getTime() -
              new Date(bookingData.checkIn).getTime()) /
              86400000,
          ),
        )
      : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review your booking</h2>

      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-5">
        <Row
          icon={<CalendarDays size={18} className="text-blue-400" />}
          label="Dates"
        >
          {bookingData.checkIn} → {bookingData.checkOut} ({nights} night
          {nights !== 1 ? 's' : ''})
        </Row>
        <Row
          icon={<Users size={18} className="text-blue-400" />}
          label="Guests"
        >
          {bookingData.guests} guest{bookingData.guests > 1 ? 's' : ''}
        </Row>
        {bookingData.specialRequests && (
          <Row
            icon={<MessageSquare size={18} className="text-blue-400" />}
            label="Requests"
          >
            {bookingData.specialRequests}
          </Row>
        )}
        <Row
          icon={<CreditCard size={18} className="text-blue-400" />}
          label="Payment"
        >
          {bookingData.paymentMethod === 'stellar'
            ? 'Stellar Wallet (XLM)'
            : 'Credit / Debit Card'}
        </Row>
      </div>

      <p className="text-xs text-blue-300/40">
        By confirming, you agree to the host&apos;s cancellation policy and our
        terms of service.
      </p>

      <div className="flex gap-3">
        <button
          onClick={onPrevious}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-white/10 border border-white/10 rounded-xl font-semibold hover:bg-white/20 transition-all disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Confirming...
            </>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-blue-300/60 mb-0.5">{label}</p>
        <p className="text-sm text-white">{children}</p>
      </div>
    </div>
  );
}
