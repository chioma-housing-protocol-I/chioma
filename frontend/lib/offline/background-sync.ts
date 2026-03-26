/**
 * Background sync service using Service Worker API.
 * Automatically syncs data when connection is restored.
 */

import { syncOfflineData } from './sync-manager';
import { setMetadata, getMetadata } from './db';

// ─── Constants ───────────────────────────────────────────────────────────────

const SYNC_TAG = 'chioma-offline-sync';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Service Worker Registration ─────────────────────────────────────────────

/**
 * Register the service worker for background sync.
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if Background Sync is supported
    if ('sync' in registration) {
      // Type assertion for sync property
      const syncManager = (
        registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync;
      await syncManager.register(SYNC_TAG);
      console.log('Background sync registered');
      return true;
    } else {
      console.warn('Background Sync not supported');
      // Fall back to periodic sync
      setupPeriodicSync();
      return false;
    }
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Manually trigger a sync operation.
 */
export async function triggerSync(): Promise<void> {
  try {
    const result = await syncOfflineData();
    await setMetadata(LAST_SYNC_KEY, Date.now());

    if (result.success) {
      console.log('Sync completed successfully:', result);
    } else {
      console.warn('Sync completed with errors:', result);
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

/**
 * Get the last sync timestamp.
 */
export async function getLastSyncTime(): Promise<number | null> {
  return getMetadata<number>(LAST_SYNC_KEY);
}

/**
 * Check if sync is needed based on last sync time.
 */
export async function shouldSync(): Promise<boolean> {
  const lastSync = await getLastSyncTime();
  if (!lastSync) return true;

  const timeSinceLastSync = Date.now() - lastSync;
  return timeSinceLastSync > SYNC_INTERVAL_MS;
}

// ─── Fallback Periodic Sync ──────────────────────────────────────────────────

let periodicSyncInterval: NodeJS.Timeout | null = null;

/**
 * Setup periodic sync as fallback when Background Sync API is not available.
 */
function setupPeriodicSync(): void {
  if (periodicSyncInterval) {
    clearInterval(periodicSyncInterval);
  }

  periodicSyncInterval = setInterval(async () => {
    if (navigator.onLine && (await shouldSync())) {
      await triggerSync();
    }
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop periodic sync.
 */
export function stopPeriodicSync(): void {
  if (periodicSyncInterval) {
    clearInterval(periodicSyncInterval);
    periodicSyncInterval = null;
  }
}

// ─── Online/Offline Event Handlers ───────────────────────────────────────────

/**
 * Setup automatic sync when connection is restored.
 */
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    console.log('Connection restored, triggering sync...');
    await triggerSync();
  };

  window.addEventListener('online', handleOnline);

  // Also setup periodic sync as fallback
  setupPeriodicSync();

  return () => {
    window.removeEventListener('online', handleOnline);
    stopPeriodicSync();
  };
}
