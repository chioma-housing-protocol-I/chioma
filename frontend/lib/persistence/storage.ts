/**
 * Typed localStorage utilities with validation and cross-tab synchronization.
 * Provides a safe abstraction over browser storage APIs.
 */

import { type ZodSchema } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StorageOptions<T> {
  /** Zod schema to validate stored data before restoring it. */
  schema?: ZodSchema<T>;
  /** Version number for schema migration. Stored data with a mismatched
   *  version is discarded rather than restored with stale shapes. */
  version?: number;
}

interface StorageEnvelope<T> {
  data: T;
  version: number;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isServer(): boolean {
  return typeof window === 'undefined';
}

function buildKey(namespace: string, key: string): string {
  return `chioma_${namespace}_${key}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Read a value from localStorage, optionally validating it against a Zod
 * schema. Returns `null` when the key is missing, the data is corrupted, or
 * the version does not match.
 */
export function readStorage<T>(
  namespace: string,
  key: string,
  options: StorageOptions<T> = {},
): T | null {
  if (isServer()) return null;

  const fullKey = buildKey(namespace, key);

  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const envelope: StorageEnvelope<T> = JSON.parse(raw);

    if (options.version !== undefined && envelope.version !== options.version) {
      localStorage.removeItem(fullKey);
      return null;
    }

    if (options.schema) {
      const result = options.schema.safeParse(envelope.data);
      if (!result.success) {
        localStorage.removeItem(fullKey);
        return null;
      }
      return result.data;
    }

    return envelope.data;
  } catch {
    localStorage.removeItem(fullKey);
    return null;
  }
}

/**
 * Write a value to localStorage wrapped in a versioned envelope.
 */
export function writeStorage<T>(
  namespace: string,
  key: string,
  data: T,
  version = 1,
): void {
  if (isServer()) return;

  const fullKey = buildKey(namespace, key);
  const envelope: StorageEnvelope<T> = {
    data,
    version,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(fullKey, JSON.stringify(envelope));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

/**
 * Remove a value from localStorage.
 */
export function removeStorage(namespace: string, key: string): void {
  if (isServer()) return;
  localStorage.removeItem(buildKey(namespace, key));
}

/**
 * Clear all Chioma-namespaced keys from localStorage.
 */
export function clearNamespace(namespace: string): void {
  if (isServer()) return;

  const prefix = `chioma_${namespace}_`;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) keysToRemove.push(k);
  }

  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ─── Cross-Tab Synchronization ───────────────────────────────────────────────

type StorageListener = (event: StorageEvent) => void;

/**
 * Subscribe to cross-tab storage changes for a specific namespaced key.
 * Returns an unsubscribe function.
 */
export function onStorageChange(
  namespace: string,
  key: string,
  callback: (newValue: unknown) => void,
): () => void {
  if (isServer()) return () => {};

  const fullKey = buildKey(namespace, key);

  const listener: StorageListener = (event) => {
    if (event.key !== fullKey) return;

    if (!event.newValue) {
      callback(null);
      return;
    }

    try {
      const envelope: StorageEnvelope<unknown> = JSON.parse(event.newValue);
      callback(envelope.data);
    } catch {
      callback(null);
    }
  };

  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
