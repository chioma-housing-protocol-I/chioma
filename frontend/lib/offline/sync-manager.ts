/**
 * Sync manager for handling offline queue synchronization.
 * Processes queued actions when connection is restored.
 */

import { apiClient } from '@/lib/api-client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  addConflict,
  type SyncQueueItem,
} from './db';
import { logError } from '@/lib/errors';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  conflicts: number;
}

export interface SyncOptions {
  maxRetries?: number;
  onProgress?: (current: number, total: number) => void;
  onConflict?: (item: SyncQueueItem) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;
const SYNC_BATCH_SIZE = 10;

// ─── Sync State ──────────────────────────────────────────────────────────────

let isSyncing = false;
let syncListeners: Array<(result: SyncResult) => void> = [];

// ─── Sync Logic ──────────────────────────────────────────────────────────────

async function processSyncItem(
  item: SyncQueueItem,
  maxRetries: number,
): Promise<{ success: boolean; conflict: boolean }> {
  try {
    const endpoint = getEndpointForEntity(item.entity, item.entityId);

    switch (item.action) {
      case 'create':
        await apiClient.post(endpoint, item.payload);
        break;
      case 'update':
        await apiClient.put(endpoint, item.payload);
        break;
      case 'delete':
        await apiClient.delete(endpoint);
        break;
    }

    return { success: true, conflict: false };
  } catch (error: unknown) {
    // Check if it's a conflict error (409)
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 409
    ) {
      return { success: false, conflict: true };
    }

    // Retry logic
    if (item.retries < maxRetries) {
      item.retries += 1;
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      await updateSyncQueueItem(item);
      return { success: false, conflict: false };
    }

    logError(error as Error, {
      source: 'sync-manager',
      action: 'process-sync-item',
      metadata: { item },
    });

    return { success: false, conflict: false };
  }
}

function getEndpointForEntity(entity: string, entityId: string): string {
  const baseEndpoints: Record<string, string> = {
    properties: '/properties',
    agreements: '/agreements',
    payments: '/payments',
    maintenance: '/maintenance',
    notifications: '/notifications',
  };

  const base = baseEndpoints[entity] || `/${entity}`;
  return entityId ? `${base}/${entityId}` : base;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Process the sync queue and attempt to sync all pending items.
 */
export async function syncOfflineData(
  options: SyncOptions = {},
): Promise<SyncResult> {
  if (isSyncing) {
    return {
      success: false,
      processed: 0,
      failed: 0,
      conflicts: 0,
    };
  }

  isSyncing = true;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  try {
    const queue = await getSyncQueue();
    const total = queue.length;
    let processed = 0;
    let failed = 0;
    let conflicts = 0;

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < queue.length; i += SYNC_BATCH_SIZE) {
      const batch = queue.slice(i, i + SYNC_BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          const result = await processSyncItem(item, maxRetries);

          if (result.success) {
            await removeSyncQueueItem(item.id);
            processed++;
          } else if (result.conflict) {
            // Handle conflict - store for manual resolution
            await addConflict({
              entity: item.entity,
              entityId: item.entityId,
              localVersion: item.payload,
              serverVersion: null, // Would need to fetch from server
            });
            await removeSyncQueueItem(item.id);
            conflicts++;
            options.onConflict?.(item);
          } else {
            failed++;
          }

          options.onProgress?.(processed + failed + conflicts, total);
        }),
      );
    }

    const result: SyncResult = {
      success: failed === 0 && conflicts === 0,
      processed,
      failed,
      conflicts,
    };

    // Notify listeners
    syncListeners.forEach((listener) => listener(result));

    return result;
  } finally {
    isSyncing = false;
  }
}

/**
 * Check if sync is currently in progress.
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Subscribe to sync completion events.
 */
export function onSyncComplete(
  callback: (result: SyncResult) => void,
): () => void {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== callback);
  };
}

/**
 * Get the current sync queue size.
 */
export async function getSyncQueueSize(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}
