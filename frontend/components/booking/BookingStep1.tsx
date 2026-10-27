'use client';

import { useMemo, useState } from 'react';
import { useAvailability, type AvailabilityDay } from '@/lib/query/hooks';

interface Props {
  onNext: (data: { checkIn: string; checkOut: string; guests: number }) => void;
  /** Property being booked. When omitted, availability/pricing is not fetched. */
  propertyId?: string;
  /** Base nightly price; used when a date has no host-set custom price. */
  pricePerNight?: number;
  currency?: string;
}

/** How far ahead we fetch availability so blocked dates can be surfaced. */
const WINDOW_DAYS = 180;

/**
 * Formats a Date as a UTC-anchored `YYYY-MM-DD` string. Used for dates that
 * are already UTC-anchored internally (addDays/eachNight below), never for
 * "today" from the user's own clock (#2039): `date.toISOString()` always
 * converts to UTC first, so for a user west of UTC in the evening, "today"
 * in their timezone can already be "tomorrow" in UTC, silently shifting
 * every date-picker constraint by a day.
 */
function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Formats a Date as the user's own local-timezone `YYYY-MM-DD` calendar date. */
function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** ISO dates for each night in a stay: check-in inclusive, check-out exclusive. */
function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  let current = checkIn;
  while (current < checkOut) {
    nights.push(current);
    current = addDays(current, 1);
  }
  return nights;
}

export function BookingStep1({
  onNext,
  propertyId,
  pricePerNight,
  currency = 'USD',
}: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);

  const today = toLocalISO(new Date());
  const windowEnd = addDays(today, WINDOW_DAYS);

  const { data: calendar, isLoading } = useAvailability(
    propertyId,
    today,
    windowEnd,
  );

  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    for (const day of calendar ?? []) map.set(day.date, day);
    return map;
  }, [calendar]);

  /** Future blocked dates in the window, for the "unavailable" display. */
  const blockedDates = useMemo(
    () =>
      (calendar ?? [])
        .filter((day) => !day.available && day.date >= today)
        .map((day) => day.date),
    [calendar, today],
  );

  /**
   * The first blocked date on or after check-in caps the check-out picker, so a
   * guest can't drag a range across a block in the native date input.
   */
  const checkOutMax = useMemo(() => {
    if (!checkIn) return undefined;
    const next = blockedDates.find((date) => date > checkIn);
    return next;
  }, [checkIn, blockedDates]);

  const nights = useMemo(
    () =>
      checkIn && checkOut && checkOut > checkIn
        ? eachNight(checkIn, checkOut)
        : [],
    [checkIn, checkOut],
  );

  const overlapsBlocked = nights.some(
    (date) => byDate.get(date)?.available === false,
  );

  /** Total price, or null when no price is known for one or more nights. */
  const total = useMemo(() => {
    if (nights.length === 0) return null;
    let sum = 0;
    for (const date of nights) {
      const nightly = byDate.get(date)?.customPrice ?? pricePerNight;
      if (nightly == null) return null;
      sum += nightly;
    }
    return sum;
  }, [nights, byDate, pricePerNight]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }),
    [currency],
  );

  const isValid =
    Boolean(checkIn) &&
    Boolean(checkOut) &&
    checkOut > checkIn &&
    !overlapsBlocked;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">When are you traveling?</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-200/70 mb-2">
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            min={today}
            max={windowEnd}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-200/70 mb-2">
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || today}
            max={checkOutMax}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-blue-200/50">Checking availability…</p>
      )}

      {blockedDates.length > 0 && (
        <div data-testid="blocked-dates">
          <p className="text-sm font-medium text-blue-200/70 mb-2">
            Unavailable dates
          </p>
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((date) => (
              <span
                key={date}
                aria-disabled="true"
                title="Unavailable"
                className="px-2.5 py-1 rounded-lg text-xs line-through text-red-200/60 bg-red-500/10 border border-red-500/20 cursor-not-allowed"
              >
                {date}
              </span>
            ))}
          </div>
        </div>
      )}

      {overlapsBlocked && (
        <p role="alert" className="text-sm text-red-300">
          Your selected dates include one or more unavailable nights. Please
          pick a different range.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-blue-200/70 mb-2">
          Guests
        </label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
            <option key={n} value={n} className="bg-slate-800">
              {n} guest{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {nights.length > 0 && total != null && !overlapsBlocked && (
        <div
          data-testid="price-summary"
          className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
        >
          <span className="text-sm text-blue-200/70">
            {priceFormatter.format(total / nights.length)} × {nights.length}{' '}
            night{nights.length > 1 ? 's' : ''}
          </span>
          <span className="font-semibold">{priceFormatter.format(total)}</span>
        </div>
      )}

      <button
        onClick={() => onNext({ checkIn, checkOut, guests })}
        disabled={!isValid}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
