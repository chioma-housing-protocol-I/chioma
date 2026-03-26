/**
 * IndexedDB wrapper for offline data storage.
 * Provides a typed interface for storing and retrieving domain entities.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OfflineEntity {
  id: string;
  data: unknown;
  timestamp: number;
  version: number;
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface ConflictRecord {
  id: string;
  entity: string;
  entityId: string;
  localVersion: unknown;
  serverVersion: unknown;
  timestamp: number;
  resolved: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'chioma_offline';
const DB_VERSION = 1;

const STORES = {
  PROPERTIES: 'properties',
  AGREEMENTS: 'agreements',
  PAYMENTS: 'payments',
  MAINTENANCE: 'maintenance',
  NOTIFICATIONS: 'notifications',
  SYNC_QUEUE: 'sync_queue',
  CONFLICTS: 'conflicts',
  METADATA: 'metadata',
} as const;

// ─── Database Initialization ─────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores for domain entities
      if (!db.objectStoreNames.contains(STORES.PROPERTIES)) {
        const propertyStore = db.createObjectStore(STORES.PROPERTIES, {
          keyPath: 'id',
        });
        propertyStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.AGREEMENTS)) {
        const agreementStore = db.createObjectStore(STORES.AGREEMENTS, {
          keyPath: 'id',
        });
        agreementStore.createIndex('timestamp', 'timestamp', {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
        const paymentStore = db.createObjectStore(STORES.PAYMENTS, {
          keyPath: 'id',
        });
        paymentStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.MAINTENANCE)) {
        const maintenanceStore = db.createObjectStore(STORES.MAINTENANCE, {
          keyPath: 'id',
        });
        maintenanceStore.createIndex('timestamp', 'timestamp', {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notificationStore = db.createObjectStore(STORES.NOTIFICATIONS, {
          keyPath: 'id',
        });
        notificationStore.createIndex('timestamp', 'timestamp', {
          unique: false,
        });
      }

      // Sync queue for offline actions
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('entity', 'entity', { unique: false });
      }

      // Conflict resolution tracking
      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const conflictStore = db.createObjectStore(STORES.CONFLICTS, {
          keyPath: 'id',
        });
        conflictStore.createIndex('resolved', 'resolved', { unique: false });
        conflictStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Metadata for sync state
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

// ─── Generic CRUD Operations ─────────────────────────────────────────────────

export async function saveEntity<T>(
  storeName: string,
  entity: T & { id: string },
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    const offlineEntity: OfflineEntity = {
      id: entity.id,
      data: entity,
      timestamp: Date.now(),
      version: 1,
    };

    const request = store.put(offlineEntity);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getEntity<T>(
  storeName: string,
  id: string,
): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as OfflineEntity | undefined;
      resolve(result ? (result.data as T) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllEntities<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as OfflineEntity[];
      resolve(results.map((r) => r.data as T));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteEntity(
  storeName: string,
  id: string,
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Sync Queue Operations ───────────────────────────────────────────────────

export async function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>,
): Promise<string> {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `${item.entity}_${item.entityId}_${Date.now()}`,
    timestamp: Date.now(),
    retries: 0,
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.add(queueItem);

    request.onsuccess = () => resolve(queueItem.id);
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAllEntities<SyncQueueItem>(STORES.SYNC_QUEUE);
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  return deleteEntity(STORES.SYNC_QUEUE, id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Conflict Management ─────────────────────────────────────────────────────

export async function addConflict(
  conflict: Omit<ConflictRecord, 'id' | 'timestamp' | 'resolved'>,
): Promise<string> {
  const conflictRecord: ConflictRecord = {
    ...conflict,
    id: `conflict_${conflict.entity}_${conflict.entityId}_${Date.now()}`,
    timestamp: Date.now(),
    resolved: false,
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFLICTS], 'readwrite');
    const store = transaction.objectStore(STORES.CONFLICTS);
    const request = store.add(conflictRecord);

    request.onsuccess = () => resolve(conflictRecord.id);
    request.onerror = () => reject(request.error);
  });
}

export async function getUnresolvedConflicts(): Promise<ConflictRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFLICTS], 'readonly');
    const store = transaction.objectStore(STORES.CONFLICTS);
    const index = store.index('resolved');
    const request = index.getAll(IDBKeyRange.only(false));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function resolveConflict(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFLICTS], 'readwrite');
    const store = transaction.objectStore(STORES.CONFLICTS);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const conflict = getRequest.result as ConflictRecord;
      if (conflict) {
        conflict.resolved = true;
        const putRequest = store.put(conflict);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ─── Metadata Operations ─────────────────────────────────────────────────────

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.put({ key, value, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMetadata<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readonly');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as
        | { key: string; value: T; timestamp: number }
        | undefined;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { STORES };
