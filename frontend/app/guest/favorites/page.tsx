'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavorites, useRemoveFavorite } from '@/lib/query/hooks';

export default function GuestFavoritesPage() {
  const router = useRouter();
  const { data: favorites = [], isLoading, isError } = useFavorites();
  const removeFavorite = useRemoveFavorite();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Favorites</h1>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-blue-200/70">
          Loading saved properties...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Favorites</h1>
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-100">
          We could not load your saved properties. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Favorites</h1>
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved properties yet"
          description="Browse stays and tap the heart icon to save your favorites for later."
          actionLabel="Browse stays"
          onAction={() => router.push('/stays')}
          variant="dark"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((favorite) => {
            const property = favorite.property;
            const propertyId = favorite.propertyId;

            return (
              <article
                key={favorite.id ?? propertyId}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {property?.title ?? 'Saved property'}
                    </h2>
                    {property ? (
                      <p className="mt-1 text-sm text-blue-200/60">
                        {property.city}, {property.state}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFavorite.mutate(propertyId)}
                    disabled={removeFavorite.isPending}
                    className="rounded-2xl border border-white/10 p-2 text-red-300 transition hover:bg-white hover:text-red-500 disabled:opacity-50"
                    aria-label="Remove favorite"
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </button>
                </div>

                {property ? (
                  <div className="space-y-2 text-sm text-blue-100/70">
                    <p>${property.price.toLocaleString()} /mo</p>
                    <p>
                      {property.bedrooms} beds · {property.bathrooms} baths ·{' '}
                      {property.squareFeet?.toLocaleString()} sqft
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-100/60">
                    Property details will appear here when the API includes
                    them.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
