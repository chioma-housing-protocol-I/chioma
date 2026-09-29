'use client';

import { useState } from 'react';
import { FolderPlus, Heart, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  UNCATEGORIZED_COLLECTION_ID,
  useCreateFavoriteCollection,
  useDeleteFavoriteCollection,
  useFavoriteCollections,
  useFavorites,
  useMoveFavorite,
  useRemoveFavorite,
  useRenameFavoriteCollection,
} from '@/lib/query/hooks';

const ALL = 'all';

function CollectionsBar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const { data: collections = [] } = useFavoriteCollections();
  const createCollection = useCreateFavoriteCollection();
  const renameCollection = useRenameFavoriteCollection();
  const deleteCollection = useDeleteFavoriteCollection();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  const total = collections.reduce((sum, c) => sum + c.favoriteCount, 0);
  const activeCollection = collections.find((c) => c.id === active);
  const isCustom =
    activeCollection && activeCollection.id !== UNCATEGORIZED_COLLECTION_ID;

  const tab = (id: string, label: string, count?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => onSelect(id)}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active === id
          ? 'border-blue-400 bg-blue-500/20 text-white'
          : 'border-white/10 text-blue-200/70 hover:border-white/20'
      }`}
    >
      {label}
      {count !== undefined ? ` (${count})` : ''}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {tab(ALL, 'All', total)}
        {collections.map((c) => tab(c.id, c.name, c.favoriteCount))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            createCollection.mutate(name, { onSuccess: () => setNewName('') });
          }}
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection"
            maxLength={100}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-blue-200/30"
          />
          <button
            type="submit"
            disabled={createCollection.isPending}
            className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-blue-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FolderPlus size={14} /> Create
          </button>
        </form>

        {isCustom && !editing ? (
          <>
            <button
              type="button"
              onClick={() =>
                setEditing({
                  id: activeCollection.id,
                  name: activeCollection.name,
                })
              }
              className="flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-blue-200 hover:bg-white/10"
            >
              <Pencil size={14} /> Rename
            </button>
            <button
              type="button"
              onClick={() =>
                deleteCollection.mutate(activeCollection.id, {
                  onSuccess: () => onSelect(ALL),
                })
              }
              className="flex items-center gap-1 rounded-xl border border-red-400/20 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </>
        ) : null}

        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = editing.name.trim();
              if (!name) return;
              renameCollection.mutate(
                { id: editing.id, name },
                { onSuccess: () => setEditing(null) },
              );
            }}
          >
            <input
              autoFocus
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              maxLength={100}
              aria-label="Collection name"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl px-3 py-1.5 text-sm text-blue-200/70"
            >
              Cancel
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default function GuestFavoritesPage() {
  const router = useRouter();
  const [activeCollection, setActiveCollection] = useState<string>(ALL);
  const {
    data: favorites = [],
    isLoading,
    isError,
  } = useFavorites(activeCollection === ALL ? undefined : activeCollection);
  const { data: collections = [] } = useFavoriteCollections();
  const removeFavorite = useRemoveFavorite();
  const moveFavorite = useMoveFavorite();

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
      <CollectionsBar
        active={activeCollection}
        onSelect={setActiveCollection}
      />
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

                {collections.length > 0 ? (
                  <label className="mt-4 flex items-center gap-2 text-xs text-blue-200/60">
                    Collection
                    <select
                      value={
                        favorite.collectionId ?? UNCATEGORIZED_COLLECTION_ID
                      }
                      onChange={(e) =>
                        moveFavorite.mutate({
                          propertyId,
                          collectionId:
                            e.target.value === UNCATEGORIZED_COLLECTION_ID
                              ? null
                              : e.target.value,
                        })
                      }
                      disabled={moveFavorite.isPending}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-white"
                    >
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
