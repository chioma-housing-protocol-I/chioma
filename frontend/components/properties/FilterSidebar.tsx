'use client';

import React, { useId, useState } from 'react';
import { Star, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface FilterSidebarValues {
  minPrice?: number;
  maxPrice?: number;
  amenities: string[];
  /** Selected star ratings (1-5); a listing matches if its rating rounds to any of them. */
  ratings: number[];
}

export interface AmenityOption {
  label: string;
  value: string;
}

export interface FilterSidebarProps {
  onApply: (values: FilterSidebarValues) => void;
  onReset?: () => void;
  initialValues?: Partial<FilterSidebarValues>;
  amenityOptions?: AmenityOption[];
  ratingOptions?: number[];
  currencySymbol?: string;
  /** Renders a close button, e.g. when the sidebar is shown in a drawer. */
  onClose?: () => void;
  className?: string;
}

export const DEFAULT_AMENITY_OPTIONS: AmenityOption[] = [
  { label: 'Wi-Fi', value: 'wifi' },
  { label: 'Parking', value: 'parking' },
  { label: 'Air conditioning', value: 'air_conditioning' },
  { label: 'Furnished', value: 'furnished' },
  { label: 'Gym', value: 'gym' },
  { label: 'Swimming pool', value: 'pool' },
  { label: 'Laundry', value: 'laundry' },
  { label: 'Security', value: 'security' },
  { label: 'Pets allowed', value: 'pets_allowed' },
];

const DEFAULT_RATING_OPTIONS = [5, 4, 3, 2, 1];

const EMPTY_VALUES: FilterSidebarValues = {
  minPrice: undefined,
  maxPrice: undefined,
  amenities: [],
  ratings: [],
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item)
    ? list.filter((entry) => entry !== item)
    : [...list, item];
}

function parsePrice(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function FilterSidebar({
  onApply,
  onReset,
  initialValues,
  amenityOptions = DEFAULT_AMENITY_OPTIONS,
  ratingOptions = DEFAULT_RATING_OPTIONS,
  currencySymbol = '$',
  onClose,
  className = '',
}: FilterSidebarProps) {
  const baseId = useId();
  const [minPrice, setMinPrice] = useState(
    initialValues?.minPrice !== undefined ? String(initialValues.minPrice) : '',
  );
  const [maxPrice, setMaxPrice] = useState(
    initialValues?.maxPrice !== undefined ? String(initialValues.maxPrice) : '',
  );
  const [amenities, setAmenities] = useState<string[]>(
    initialValues?.amenities ?? [],
  );
  const [ratings, setRatings] = useState<number[]>(
    initialValues?.ratings ?? [],
  );

  const parsedMin = parsePrice(minPrice);
  const parsedMax = parsePrice(maxPrice);
  const priceError =
    (minPrice !== '' && parsedMin === undefined) ||
    (maxPrice !== '' && parsedMax === undefined)
      ? 'Enter a valid, non-negative amount'
      : parsedMin !== undefined &&
          parsedMax !== undefined &&
          parsedMin > parsedMax
        ? 'Minimum price cannot exceed maximum price'
        : null;

  const activeCount =
    (parsedMin !== undefined || parsedMax !== undefined ? 1 : 0) +
    amenities.length +
    ratings.length;

  const handleApply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (priceError) return;
    onApply({
      minPrice: parsedMin,
      maxPrice: parsedMax,
      amenities,
      ratings: [...ratings].sort((a, b) => b - a),
    });
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setAmenities([]);
    setRatings([]);
    if (onReset) onReset();
    else onApply({ ...EMPTY_VALUES });
  };

  return (
    <aside
      aria-label="Filters"
      className={cn(
        'w-full rounded-xl border border-neutral-200 bg-white p-5 text-neutral-900 md:w-72',
        className,
      )}
      data-testid="filter-sidebar"
    >
      <form onSubmit={handleApply} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                {activeCount}
              </span>
            )}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="rounded-full p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-700">
            Price range
          </legend>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <label htmlFor={`${baseId}-min-price`} className="sr-only">
                Minimum price
              </label>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                {currencySymbol}
              </span>
              <input
                id={`${baseId}-min-price`}
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Min"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                aria-invalid={priceError ? true : undefined}
                data-testid="filter-min-price"
                className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-neutral-400">–</span>
            <div className="relative flex-1">
              <label htmlFor={`${baseId}-max-price`} className="sr-only">
                Maximum price
              </label>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                {currencySymbol}
              </span>
              <input
                id={`${baseId}-max-price`}
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                aria-invalid={priceError ? true : undefined}
                data-testid="filter-max-price"
                className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {priceError && (
            <p role="alert" className="text-xs text-red-600">
              {priceError}
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-700">
            Amenities
          </legend>
          <div className="space-y-2">
            {amenityOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(option.value)}
                  onChange={() =>
                    setAmenities((prev) => toggle(prev, option.value))
                  }
                  data-testid={`filter-amenity-${option.value}`}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-neutral-700">
            Rating
          </legend>
          <div className="space-y-2">
            {ratingOptions.map((rating) => (
              <label
                key={rating}
                className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  checked={ratings.includes(rating)}
                  onChange={() => setRatings((prev) => toggle(prev, rating))}
                  data-testid={`filter-rating-${rating}`}
                  className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className="flex items-center gap-0.5"
                  aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
                >
                  {Array.from({ length: 5 }, (_, idx) => (
                    <Star
                      key={idx}
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4',
                        idx < rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-300',
                      )}
                    />
                  ))}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3 border-t border-neutral-200 pt-4">
          <button
            type="button"
            onClick={handleReset}
            data-testid="filter-reset-btn"
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={Boolean(priceError)}
            data-testid="filter-apply-btn"
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply filters
          </button>
        </div>
      </form>
    </aside>
  );
}

export default FilterSidebar;
