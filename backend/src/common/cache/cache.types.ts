export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  cleanups: number;
  hitRate: number;
  missRate: number;
  /** Keys tracked for dependency-based invalidation (approximate) */
  dependencyTrackedKeys: number;
}

export interface GetOrSetOptions {
  /** Tags used to invalidate this entry (e.g. property:uuid, user:uuid) */
  dependencies?: string[];
}
