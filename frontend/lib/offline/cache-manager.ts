/**
 * Cache manager for critical data with offline support.
 * Integrates with React Query and IndexedDB.
 */

import {
  saveEntity,
  getEntity,
  getAllEntities,
  deleteEntity,
  STORES,
} from './db';
import type {
  Property,
  RentalAgreement,
  Payment,
  MaintenanceRequest,
} from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CacheableEntity =
  | Property
  | RentalAgreement
  | Payment
  | MaintenanceRequest;

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  priority?: 'high' | 'medium' | 'low';
}

// ─── Cache Priority ──────────────────────────────────────────────────────────

const CACHE_PRIORITIES = {
  high: ['properties', 'agreements', 'payments'],
  medium: ['maintenance', 'notifications'],
  low: [],
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Cache a property for offline access.
 */
export async function cacheProperty(property: Property): Promise<void> {
  await saveEntity(STORES.PROPERTIES, property);
}

/**
 * Get a cached property.
 */
export async function getCachedProperty(id: string): Promise<Property | null> {
  return getEntity<Property>(STORES.PROPERTIES, id);
}

/**
 * Get all cached properties.
 */
export async function getAllCachedProperties(): Promise<Property[]> {
  return getAllEntities<Property>(STORES.PROPERTIES);
}

/**
 * Cache a rental agreement for offline access.
 */
export async function cacheAgreement(
  agreement: RentalAgreement,
): Promise<void> {
  await saveEntity(STORES.AGREEMENTS, agreement);
}

/**
 * Get a cached agreement.
 */
export async function getCachedAgreement(
  id: string,
): Promise<RentalAgreement | null> {
  return getEntity<RentalAgreement>(STORES.AGREEMENTS, id);
}

/**
 * Get all cached agreements.
 */
export async function getAllCachedAgreements(): Promise<RentalAgreement[]> {
  return getAllEntities<RentalAgreement>(STORES.AGREEMENTS);
}

/**
 * Cache a payment for offline access.
 */
export async function cachePayment(payment: Payment): Promise<void> {
  await saveEntity(STORES.PAYMENTS, payment);
}

/**
 * Get a cached payment.
 */
export async function getCachedPayment(id: string): Promise<Payment | null> {
  return getEntity<Payment>(STORES.PAYMENTS, id);
}

/**
 * Get all cached payments.
 */
export async function getAllCachedPayments(): Promise<Payment[]> {
  return getAllEntities<Payment>(STORES.PAYMENTS);
}

/**
 * Cache a maintenance request for offline access.
 */
export async function cacheMaintenanceRequest(
  request: MaintenanceRequest,
): Promise<void> {
  await saveEntity(STORES.MAINTENANCE, request);
}

/**
 * Get a cached maintenance request.
 */
export async function getCachedMaintenanceRequest(
  id: string,
): Promise<MaintenanceRequest | null> {
  return getEntity<MaintenanceRequest>(STORES.MAINTENANCE, id);
}

/**
 * Get all cached maintenance requests.
 */
export async function getAllCachedMaintenanceRequests(): Promise<
  MaintenanceRequest[]
> {
  return getAllEntities<MaintenanceRequest>(STORES.MAINTENANCE);
}

/**
 * Remove an entity from cache.
 */
export async function removeCachedEntity(
  storeName: string,
  id: string,
): Promise<void> {
  await deleteEntity(storeName, id);
}

/**
 * Determine if an entity should be cached based on priority.
 */
export function shouldCache(
  entityType: string,
  priority: CacheOptions['priority'] = 'medium',
): boolean {
  if (priority === 'high') {
    return CACHE_PRIORITIES.high.includes(entityType);
  }
  if (priority === 'medium') {
    return (
      CACHE_PRIORITIES.high.includes(entityType) ||
      CACHE_PRIORITIES.medium.includes(entityType)
    );
  }
  return true;
}

/**
 * Batch cache multiple entities.
 */
export async function batchCacheEntities<T extends { id: string }>(
  storeName: string,
  entities: T[],
): Promise<void> {
  await Promise.all(entities.map((entity) => saveEntity(storeName, entity)));
}
