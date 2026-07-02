/**
 * Conflict resolution strategies for offline sync.
 * Handles merge conflicts when local and server data diverge.
 */

import {
  getUnresolvedConflicts,
  resolveConflict,
  type ConflictRecord,
} from './db';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConflictResolutionStrategy =
  | 'server-wins'
  | 'client-wins'
  | 'last-write-wins'
  | 'manual';

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedData: unknown;
}

export interface ConflictHandler {
  canHandle: (conflict: ConflictRecord) => boolean;
  resolve: (
    conflict: ConflictRecord,
    strategy: ConflictResolutionStrategy,
  ) => Promise<unknown>;
}

// ─── Built-in Strategies ─────────────────────────────────────────────────────

/**
 * Server wins - always prefer server version.
 */
function serverWinsStrategy(conflict: ConflictRecord): unknown {
  return conflict.serverVersion;
}

/**
 * Client wins - always prefer local version.
 */
function clientWinsStrategy(conflict: ConflictRecord): unknown {
  return conflict.localVersion;
}

/**
 * Last write wins - compare timestamps and use most recent.
 */
function lastWriteWinsStrategy(conflict: ConflictRecord): unknown {
  const local = conflict.localVersion as { updatedAt?: string };
  const server = conflict.serverVersion as { updatedAt?: string };

  if (!local.updatedAt || !server.updatedAt) {
    return conflict.serverVersion;
  }

  const localTime = new Date(local.updatedAt).getTime();
  const serverTime = new Date(server.updatedAt).getTime();

  return localTime > serverTime
    ? conflict.localVersion
    : conflict.serverVersion;
}

/**
 * Smart merge - attempt to merge non-conflicting fields.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function smartMergeStrategy(conflict: ConflictRecord): unknown {
  const local = conflict.localVersion as Record<string, unknown>;
  const server = conflict.serverVersion as Record<string, unknown>;

  if (!local || !server) return server;

  const merged: Record<string, unknown> = { ...server };

  // Merge fields that don't conflict
  for (const key in local) {
    if (!(key in server)) {
      merged[key] = local[key];
    } else if (local[key] !== server[key]) {
      // For conflicting fields, prefer server by default
      // Could be enhanced with field-specific logic
      merged[key] = server[key];
    }
  }

  return merged;
}

// ─── Conflict Handlers ───────────────────────────────────────────────────────

const defaultHandler: ConflictHandler = {
  canHandle: () => true,
  resolve: async (conflict, strategy) => {
    switch (strategy) {
      case 'server-wins':
        return serverWinsStrategy(conflict);
      case 'client-wins':
        return clientWinsStrategy(conflict);
      case 'last-write-wins':
        return lastWriteWinsStrategy(conflict);
      case 'manual':
        throw new Error('Manual resolution requires user intervention');
      default:
        return serverWinsStrategy(conflict);
    }
  },
};

// Entity-specific handlers can be registered here
const handlers: ConflictHandler[] = [defaultHandler];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Register a custom conflict handler for specific entity types.
 */
export function registerConflictHandler(handler: ConflictHandler): void {
  handlers.unshift(handler);
}

/**
 * Resolve a single conflict using the specified strategy.
 */
export async function resolveConflictWithStrategy(
  conflict: ConflictRecord,
  strategy: ConflictResolutionStrategy,
): Promise<unknown> {
  const handler = handlers.find((h) => h.canHandle(conflict));

  if (!handler) {
    throw new Error(`No handler found for conflict: ${conflict.id}`);
  }

  const resolvedData = await handler.resolve(conflict, strategy);
  await resolveConflict(conflict.id);

  return resolvedData;
}

/**
 * Resolve all unresolved conflicts using the specified strategy.
 */
export async function resolveAllConflicts(
  strategy: ConflictResolutionStrategy,
): Promise<ConflictResolution[]> {
  const conflicts = await getUnresolvedConflicts();
  const resolutions: ConflictResolution[] = [];

  for (const conflict of conflicts) {
    try {
      const resolvedData = await resolveConflictWithStrategy(
        conflict,
        strategy,
      );
      resolutions.push({
        conflictId: conflict.id,
        strategy,
        resolvedData,
      });
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflict.id}:`, error);
    }
  }

  return resolutions;
}

/**
 * Get all unresolved conflicts for user review.
 */
export async function getConflictsForReview(): Promise<ConflictRecord[]> {
  return getUnresolvedConflicts();
}

/**
 * Check if there are any unresolved conflicts.
 */
export async function hasUnresolvedConflicts(): Promise<boolean> {
  const conflicts = await getUnresolvedConflicts();
  return conflicts.length > 0;
}
