/**
 * Shared versioned persistence config for Zustand `persist` stores.
 *
 * Every persisted store must declare a `version` and optional `migrations`.
 * Unrecognized or future versions are dropped rather than merged into current
 * state, preventing stale localStorage shapes from breaking hydration.
 */

import type { PersistOptions } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

type MigrationFn<T> = (state: unknown) => Partial<T> | undefined;

export interface VersionedPersistOptions<T, Persisted = T> {
  name: string;
  version: number;
  migrations?: Record<number, MigrationFn<Persisted>>;
  partialize?: PersistOptions<T, Persisted>['partialize'];
  storage?: PersistOptions<T, Persisted>['storage'];
  onRehydrateStorage?: PersistOptions<T, Persisted>['onRehydrateStorage'];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds persist options with version tracking and sequential migrations.
 * Returns `undefined` from migrate to reset the store when the stored version
 * has no migration path or is newer than the current schema version.
 */
export function createVersionedPersistConfig<T, Persisted = T>(
  options: VersionedPersistOptions<T, Persisted>,
): Pick<
  PersistOptions<T, Persisted>,
  'name' | 'version' | 'migrate' | 'partialize' | 'storage' | 'onRehydrateStorage'
> {
  const {
    name,
    version,
    migrations = {},
    partialize,
    storage,
    onRehydrateStorage,
  } = options;

  return {
    name,
    version,
    partialize,
    storage,
    onRehydrateStorage,
    migrate: (persistedState, fromVersion) => {
      if (fromVersion > version) {
        return undefined as Persisted;
      }

      let state: unknown = persistedState;

      for (let v = fromVersion; v < version; v += 1) {
        const nextVersion = v + 1;
        const migrator = migrations[nextVersion];
        if (!migrator) {
          return undefined as Persisted;
        }
        const migrated = migrator(state);
        if (migrated === undefined) {
          return undefined as Persisted;
        }
        state = migrated;
      }

      return state as Persisted;
    },
  };
}
