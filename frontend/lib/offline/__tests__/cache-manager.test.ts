import { describe, it, expect } from 'vitest';
import {
  shouldCache,
  cacheProperty,
  getCachedProperty,
  getAllCachedProperties,
  cacheAgreement,
  getCachedAgreement,
  getAllCachedAgreements,
  cachePayment,
  getCachedPayment,
  getAllCachedPayments,
  cacheMaintenanceRequest,
  removeCachedEntity,
  batchCacheEntities,
} from '../cache-manager';

describe('shouldCache', () => {
  it('returns true for high-priority entities when priority is high', () => {
    expect(shouldCache('properties', 'high')).toBe(true);
    expect(shouldCache('agreements', 'high')).toBe(true);
    expect(shouldCache('payments', 'high')).toBe(true);
  });

  it('returns false for medium-priority entities when priority is high', () => {
    expect(shouldCache('maintenance', 'high')).toBe(false);
    expect(shouldCache('notifications', 'high')).toBe(false);
  });

  it('returns false for unknown entity types when priority is high', () => {
    expect(shouldCache('unknown_entity', 'high')).toBe(false);
  });

  it('returns true for high-priority entities when priority is medium', () => {
    expect(shouldCache('properties', 'medium')).toBe(true);
    expect(shouldCache('agreements', 'medium')).toBe(true);
  });

  it('returns true for medium-priority entities when priority is medium', () => {
    expect(shouldCache('maintenance', 'medium')).toBe(true);
    expect(shouldCache('notifications', 'medium')).toBe(true);
  });

  it('returns false for unknown entity types when priority is medium', () => {
    expect(shouldCache('unknown_entity', 'medium')).toBe(false);
  });

  it('defaults to medium priority', () => {
    expect(shouldCache('maintenance')).toBe(true);
    expect(shouldCache('properties')).toBe(true);
  });

  it('returns true for any entity type when priority is low', () => {
    expect(shouldCache('unknown_entity', 'low')).toBe(true);
    expect(shouldCache('maintenance', 'low')).toBe(true);
    expect(shouldCache('properties', 'low')).toBe(true);
  });
});

describe('cache-manager function exports', () => {
  it('exports cacheProperty as a function', () => {
    expect(typeof cacheProperty).toBe('function');
  });

  it('exports getCachedProperty as a function', () => {
    expect(typeof getCachedProperty).toBe('function');
  });

  it('exports getAllCachedProperties as a function', () => {
    expect(typeof getAllCachedProperties).toBe('function');
  });

  it('exports cacheAgreement as a function', () => {
    expect(typeof cacheAgreement).toBe('function');
  });

  it('exports getCachedAgreement as a function', () => {
    expect(typeof getCachedAgreement).toBe('function');
  });

  it('exports getAllCachedAgreements as a function', () => {
    expect(typeof getAllCachedAgreements).toBe('function');
  });

  it('exports cachePayment as a function', () => {
    expect(typeof cachePayment).toBe('function');
  });

  it('exports getCachedPayment as a function', () => {
    expect(typeof getCachedPayment).toBe('function');
  });

  it('exports getAllCachedPayments as a function', () => {
    expect(typeof getAllCachedPayments).toBe('function');
  });

  it('exports cacheMaintenanceRequest as a function', () => {
    expect(typeof cacheMaintenanceRequest).toBe('function');
  });

  it('exports removeCachedEntity as a function', () => {
    expect(typeof removeCachedEntity).toBe('function');
  });

  it('exports batchCacheEntities as a function', () => {
    expect(typeof batchCacheEntities).toBe('function');
  });
});
