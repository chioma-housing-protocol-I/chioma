'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useMyRecommendations } from '@/lib/query/hooks/use-recommendations';

const REASON_LABELS: Record<string, string> = {
  city_match: 'In your city',
  within_budget: 'Within budget',
  bedroom_match: 'Enough bedrooms',
  amenity_match: 'Amenities you like',
};

export function RecommendedForYou() {
  const { data: items = [], isLoading, isError } = useMyRecommendations(6);

  if (isError || (!isLoading && items.length === 0)) return null;

  return (
    <section className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-300" /> Recommended for you
      </h2>
      {isLoading ? (
        <p className="text-sm text-blue-300/60">Finding stays for you…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.propertyId}
              href={`/stays/${item.propertyId}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="mb-3 h-32 w-full rounded-xl object-cover"
                />
              ) : null}
              <p className="font-semibold text-white">{item.title}</p>
              <p className="text-sm text-blue-300/60">
                {item.city} · {item.bedrooms} beds ·{' '}
                {!item.currency || item.currency === 'USD'
                  ? '$'
                  : `${item.currency} `}
                {item.monthlyRent.toLocaleString()}/mo
              </p>
              {item.reasons.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.reasons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-200"
                    >
                      {REASON_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecommendedForYou;
