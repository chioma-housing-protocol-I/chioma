'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import type { AvailabilityDay } from '@/lib/query/hooks/use-availability';

interface CalendarDayModalProps {
  day: AvailabilityDay;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onSetPrice: (price: number) => void;
}

export function CalendarDayModal({
  day,
  isSaving = false,
  error,
  onClose,
  onBlock,
  onUnblock,
  onSetPrice,
}: CalendarDayModalProps) {
  const [price, setPrice] = useState(
    day.customPrice != null ? String(day.customPrice) : '',
  );

  useEffect(() => {
    setPrice(day.customPrice != null ? String(day.customPrice) : '');
  }, [day.date, day.customPrice]);

  const parsedPrice = Number(price);
  const priceValid =
    price !== '' && !Number.isNaN(parsedPrice) && parsedPrice >= 0;
  const bookedBy = day.blockedByBookingId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="calendar-day-title" className="text-lg font-semibold">
            {format(parseISO(day.date), 'EEEE, MMM d, yyyy')}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-blue-200/70">
          Status:{' '}
          <span className={day.available ? 'text-emerald-400' : 'text-red-400'}>
            {day.available ? 'Available' : bookedBy ? 'Booked' : 'Blocked'}
          </span>
        </p>

        <div className="mb-4">
          {day.available ? (
            <button
              onClick={onBlock}
              disabled={isSaving}
              className="w-full rounded-xl bg-red-500/80 px-4 py-2 text-sm font-medium hover:bg-red-500 disabled:opacity-50"
            >
              Block this date
            </button>
          ) : (
            <button
              onClick={onUnblock}
              disabled={isSaving || !!bookedBy}
              className="w-full rounded-xl bg-emerald-500/80 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              Unblock this date
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (priceValid) onSetPrice(parsedPrice);
          }}
          className="space-y-2"
        >
          <label
            htmlFor="calendar-day-price"
            className="block text-sm text-blue-300/60"
          >
            Nightly price
          </label>
          <div className="flex gap-2">
            <input
              id="calendar-day-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isSaving || !priceValid}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
