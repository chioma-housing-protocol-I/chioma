import { describe, it, expect } from 'vitest';
import {
  getTimeoutForEndpoint,
  getTimeoutForMethod,
  DEFAULT_TIMEOUTS,
} from '@/lib/config/timeouts';

describe('Timeout Configuration', () => {
  describe('getTimeoutForEndpoint', () => {
    it('should return analytics timeout for analytics endpoints', () => {
      const timeout = getTimeoutForEndpoint('/analytics/landlord/dashboard');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.analytics);
    });

    it('should return payment timeout for payment endpoints', () => {
      const timeout = getTimeoutForEndpoint('/payments/123');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.payments);
    });

    it('should return properties timeout for property endpoints', () => {
      const timeout = getTimeoutForEndpoint('/properties/123');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.properties);
    });

    it('should return users timeout for user endpoints', () => {
      const timeout = getTimeoutForEndpoint('/users/me');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.users);
    });

    it('should return documents timeout for document endpoints', () => {
      const timeout = getTimeoutForEndpoint('/documents/123');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.documents);
    });

    it('should return search timeout for search endpoints', () => {
      const timeout = getTimeoutForEndpoint('/search/properties');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.search);
    });

    it('should return upload timeout for upload endpoints', () => {
      const timeout = getTimeoutForEndpoint('/upload/document');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.uploads);
    });

    it('should return default timeout for unknown endpoints', () => {
      const timeout = getTimeoutForEndpoint('/unknown/endpoint');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.default);
    });

    it('should be case insensitive', () => {
      const timeout = getTimeoutForEndpoint('/ANALYTICS/landlord/dashboard');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.analytics);
    });
  });

  describe('getTimeoutForMethod', () => {
    it('should return default timeout for GET requests', () => {
      const timeout = getTimeoutForMethod('GET');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.default);
    });

    it('should return mutations timeout for POST requests', () => {
      const timeout = getTimeoutForMethod('POST');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.mutations);
    });

    it('should return mutations timeout for PUT requests', () => {
      const timeout = getTimeoutForMethod('PUT');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.mutations);
    });

    it('should return mutations timeout for PATCH requests', () => {
      const timeout = getTimeoutForMethod('PATCH');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.mutations);
    });

    it('should return mutations timeout for DELETE requests', () => {
      const timeout = getTimeoutForMethod('DELETE');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.mutations);
    });

    it('should be case insensitive', () => {
      const timeout = getTimeoutForMethod('get');
      expect(timeout).toBe(DEFAULT_TIMEOUTS.default);
    });

    it('should return default timeout for unknown methods', () => {
      const timeout = getTimeoutForMethod('HEAD' as any);
      expect(timeout).toBe(DEFAULT_TIMEOUTS.default);
    });
  });

  describe('DEFAULT_TIMEOUTS', () => {
    it('should have all required timeout configurations', () => {
      expect(DEFAULT_TIMEOUTS).toHaveProperty('default');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('analytics');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('payments');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('properties');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('users');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('documents');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('search');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('mutations');
      expect(DEFAULT_TIMEOUTS).toHaveProperty('uploads');
    });

    it('should have reasonable timeout values', () => {
      expect(DEFAULT_TIMEOUTS.default).toBeGreaterThan(0);
      expect(DEFAULT_TIMEOUTS.analytics).toBeGreaterThan(DEFAULT_TIMEOUTS.default);
      expect(DEFAULT_TIMEOUTS.payments).toBeGreaterThan(DEFAULT_TIMEOUTS.default);
      expect(DEFAULT_TIMEOUTS.uploads).toBeGreaterThan(DEFAULT_TIMEOUTS.payments);
    });
  });
});
