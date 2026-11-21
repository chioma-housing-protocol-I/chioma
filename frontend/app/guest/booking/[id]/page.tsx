'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  CreditCard,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingDetail {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertyAddress?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  paymentMethod: string;
  totalPrice: string;
  currency: string;
  createdAt: string;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  BookingDetail['status'],
  { label: string; classes: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    dot: 'bg-amber-400 animate-pulse',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    dot: 'bg-blue-400',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-500/20 text-red-300 border-red-400/30',
    dot: 'bg-red-400',
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function nightsBetween(checkIn: string, checkOut: string) {
  const diff =
    new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// ── Data fetching ──────────────────────────────────────────────────────────────

function useBookingDetail(id: string) {
  return useQuery<BookingDetail>({
    queryKey: ['guest-booking', id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? 'Booking not found.'
            : `Failed to load booking (${res.status}).`,
        );
      }
      const data = await res.json();
      return data.data ?? data;
    },
    retry: 2,
    staleTime: 30_000,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BookingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-xl bg-white/10" />
      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="h-5 w-32 rounded-full bg-white/10" />
        <div className="h-7 w-3/4 rounded-xl bg-white/15" />
        <div className="h-4 w-48 rounded-full bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5 space-y-2"
          >
            <div className="h-4 w-20 rounded-full bg-white/10" />
            <div className="h-5 w-28 rounded-lg bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-20 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 border border-red-400/30">
        <AlertCircle className="h-7 w-7 text-red-400" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          Could not load booking
        </h2>
        <p className="text-blue-200/70 text-sm max-w-sm">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Try again
        </button>
        <Link
          href="/guest/trips"
          className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-blue-200 font-semibold text-sm transition-colors text-center"
        >
          Back to my trips
        </Link>
      </div>
    </div>
  );
}

function BookingContent({ id }: { id: string }) {
  const { data: booking, isLoading, isError, error, refetch } = useBookingDetail(id);

  if (isLoading) return <BookingSkeleton />;

  if (isError || !booking) {
    return (
      <BookingErrorState
        message={
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  const status = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Booking Details</h1>
        <span
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border ${status.classes} w-fit`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Property card */}
      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
        <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-wider mb-1">
          Property
        </p>
        <h2 className="text-xl font-bold text-white mb-2">
          {booking.propertyTitle}
        </h2>
        <div className="flex items-center gap-1.5 text-blue-200/70 text-sm">
          <MapPin className="w-4 h-4 shrink-0 text-blue-400" aria-hidden="true" />
          <span>
            {booking.propertyAddress
              ? `${booking.propertyAddress}, `
              : ''}
            {booking.propertyCity}
          </span>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Check-in */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-200/60 text-xs font-semibold uppercase tracking-wider mb-2">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            Check-in
          </div>
          <p className="text-white font-semibold">{formatDate(booking.checkIn)}</p>
        </div>

        {/* Check-out */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-200/60 text-xs font-semibold uppercase tracking-wider mb-2">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            Check-out
          </div>
          <p className="text-white font-semibold">{formatDate(booking.checkOut)}</p>
          <p className="text-blue-200/50 text-xs mt-1">
            {nights} {nights === 1 ? 'night' : 'nights'}
          </p>
        </div>

        {/* Guests */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-200/60 text-xs font-semibold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" aria-hidden="true" />
            Guests
          </div>
          <p className="text-white font-semibold">
            {booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}
          </p>
        </div>

        {/* Payment */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-blue-200/60 text-xs font-semibold uppercase tracking-wider mb-2">
            <CreditCard className="w-4 h-4" aria-hidden="true" />
            Payment
          </div>
          <p className="text-white font-semibold capitalize">
            {booking.paymentMethod}
          </p>
        </div>
      </div>

      {/* Price summary */}
      <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-blue-200/60 text-sm font-medium">Total charged</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {booking.totalPrice}{' '}
            <span className="text-base font-semibold text-blue-200/70">
              {booking.currency}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-300 text-sm font-medium bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Secured
        </div>
      </div>

      {/* Special requests */}
      {booking.specialRequests && (
        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
          <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-wider mb-2">
            Special requests
          </p>
          <p className="text-blue-200/80 text-sm leading-relaxed">
            {booking.specialRequests}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href={`/stays/${booking.propertyId}`}
          className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-blue-200 font-semibold text-sm text-center transition-colors"
        >
          View property
        </Link>
        {booking.status === 'confirmed' && (
          <Link
            href="/guest/trips"
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-sm text-center transition-all shadow-lg shadow-blue-600/20"
          >
            All my trips
          </Link>
        )}
      </div>

      {/* Booking reference */}
      <p className="text-center text-xs text-blue-200/40">
        Booking ref: {booking.id} &middot; Created{' '}
        {formatDate(booking.createdAt)}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GuestBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>

      {/*
       * ClientErrorBoundary catches render-time errors that React's own
       * rendering cycle throws — e.g. a component crash after data resolves —
       * and provides a retry button that resets local component state without
       * a full page reload. Network/fetch errors are handled inside
       * BookingContent via useQuery's isError path with a dedicated
       * BookingErrorState + retry button.
       *
       * The route-level error.tsx above this catches server-side and
       * hydration errors that escape this boundary.
       */}
      <ClientErrorBoundary
        source="guest/booking/[id]/page.tsx"
        fallbackTitle="Booking failed to load"
        fallbackDescription="Something went wrong while loading your booking. You can retry or go back to your trips."
      >
        <BookingContent id={id} />
      </ClientErrorBoundary>
    </div>
  );
}
