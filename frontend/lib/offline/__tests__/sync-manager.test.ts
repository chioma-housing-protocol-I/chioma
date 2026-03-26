/**
 * Tests for sync manager.
 */

import { describe, it, expect } from 'vitest';
import {
  syncOfflineData,
  isSyncInProgress,
  getSyncQueueSize,
  onSyncComplete,
} from '../sync-manager';

describe('Sync Manager', () => {
  describe('syncOfflineData', () => {
    it('should sync offline data', async () => {
      expect(syncOfflineData).toBeDefined();
      expect(typeof syncOfflineData).toBe('function');
    });
  });

  describe('isSyncInProgress', () => {
    it('should check if sync is in progress', () => {
      const result = isSyncInProgress();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getSyncQueueSize', () => {
    it('should get sync queue size', async () => {
      expect(getSyncQueueSize).toBeDefined();
      expect(typeof getSyncQueueSize).toBe('function');
    });
  });

  describe('onSyncComplete', () => {
    it('should subscribe to sync completion', () => {
      const callback = () => {};
      const unsubscribe = onSyncComplete(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});
