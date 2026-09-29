import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// Do not mock 'fs' globally like this, use vi.spyOn later

import {
  classifyChunks,
  getRouteSizeBytes,
  statusLabel,
} from '../../scripts/check-bundle-size.js';

describe('check-bundle-size script', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('classifyChunks', () => {
    it('treats a chunk as shared only when every route first-loads it', () => {
      const routeStats = [
        { route: '/', firstLoadChunkPaths: ['shared.js', 'home-only.js'] },
        {
          route: '/properties',
          firstLoadChunkPaths: ['shared.js', 'properties-only.js'],
        },
      ];

      const shared = classifyChunks(routeStats);
      expect(shared.has('shared.js')).toBe(true);
      expect(shared.has('home-only.js')).toBe(false);
      expect(shared.has('properties-only.js')).toBe(false);
    });

    it('returns an empty set when no chunk appears in every route', () => {
      const routeStats = [
        { route: '/', firstLoadChunkPaths: ['a.js'] },
        { route: '/properties', firstLoadChunkPaths: ['b.js'] },
      ];

      expect(classifyChunks(routeStats).size).toBe(0);
    });
  });

  describe('getRouteSizeBytes', () => {
    it('sums unique, non-shared chunk sizes for the matching route', () => {
      const routeStats = [
        {
          route: '/',
          firstLoadChunkPaths: [
            'shared.js',
            'home.js',
            'home.js', // duplicate — counted once
          ],
        },
      ];
      const sharedChunks = new Set(['shared.js']);

      vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const p = filePath.toString();
        if (p.endsWith('home.js')) return { size: 1024 } as any;
        if (p.endsWith('shared.js')) return { size: 999999 } as any;
        throw new Error('Not found');
      });

      const size = getRouteSizeBytes('/', routeStats, sharedChunks);

      // Only home.js counts — shared.js is excluded, duplicate is deduped.
      expect(size).toBe(1024);
    });

    it('returns 0 when the route has no matching entry', () => {
      const size = getRouteSizeBytes('/unknown', [], new Set());
      expect(size).toBe(0);
    });

    it('ignores chunks whose file cannot be statted', () => {
      const routeStats = [
        { route: '/', firstLoadChunkPaths: ['present.js', 'missing.js'] },
      ];

      vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const p = filePath.toString();
        if (p.endsWith('present.js')) return { size: 2048 } as any;
        throw new Error('ENOENT');
      });

      const size = getRouteSizeBytes('/', routeStats, new Set());
      expect(size).toBe(2048);
    });
  });

  describe('statusLabel', () => {
    const budget = { maxKB: 500, warnKB: 400 };

    it('returns PASS ✓ when size is below warn limit', () => {
      expect(statusLabel(300, budget)).toBe('PASS ✓');
    });

    it('returns WARN ⚠ when size is above warn limit but below max limit', () => {
      expect(statusLabel(450, budget)).toBe('WARN ⚠');
    });

    it('returns FAIL ✗ when size is above max limit', () => {
      expect(statusLabel(550, budget)).toBe('FAIL ✗');
    });
  });
});
