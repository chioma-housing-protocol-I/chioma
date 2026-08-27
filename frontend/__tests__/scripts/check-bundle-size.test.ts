import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Do not mock 'fs' globally like this, use vi.spyOn later

const { getRouteChunks, getRouteSizeBytes, statusLabel } = require('../../scripts/check-bundle-size.js');

describe('check-bundle-size script', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRouteChunks', () => {
    it('returns chunks from appBuildManifest if exact match', () => {
      const appBuildManifest = {
        pages: {
          '/dashboard': ['static/chunks/app/dashboard.js'],
        },
      };
      
      const chunks = getRouteChunks('/dashboard', {}, appBuildManifest);
      expect(chunks).toEqual(['static/chunks/app/dashboard.js']);
    });

    it('returns chunks from appBuildManifest with /page suffix', () => {
      const appBuildManifest = {
        pages: {
          '/dashboard/page': ['static/chunks/app/dashboard/page.js'],
        },
      };
      
      const chunks = getRouteChunks('/dashboard', {}, appBuildManifest);
      expect(chunks).toEqual(['static/chunks/app/dashboard/page.js']);
    });

    it('returns chunks from buildManifest if found there', () => {
      const buildManifest = {
        pages: {
          '/login': ['static/chunks/pages/login.js'],
        },
      };
      
      const chunks = getRouteChunks('/login', buildManifest, {});
      expect(chunks).toEqual(['static/chunks/pages/login.js']);
    });

    it('returns empty array if not found in either', () => {
      const chunks = getRouteChunks('/unknown', { pages: {} }, { pages: {} });
      expect(chunks).toEqual([]);
    });
  });

  describe('getRouteSizeBytes', () => {
    it('calculates sum of unique JS chunk sizes', () => {
      const buildManifest = {
        pages: {
          '/': ['chunk1.js', 'chunk2.js', 'chunk1.js', 'style.css'],
        },
      };
      
      const statSpy = vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const p = filePath.toString();
        if (p.endsWith('chunk1.js')) return { size: 1024 } as any;
        if (p.endsWith('chunk2.js')) return { size: 2048 } as any;
        throw new Error('Not found');
      });

      const size = getRouteSizeBytes('/', buildManifest, null, '/build-dir');
      
      // chunk1 is added once, chunk2 is added once. style.css is ignored
      expect(size).toBe(1024 + 2048);
      expect(statSpy).toHaveBeenCalledTimes(2);
    });
    
    it('handles missing files gracefully', () => {
      const buildManifest = {
        pages: {
          '/': ['chunk1.js', 'missing.js'],
        },
      };
      
      vi.spyOn(fs, 'statSync').mockImplementation((filePath) => {
        const p = filePath.toString();
        if (p.endsWith('chunk1.js')) return { size: 1024 } as any;
        throw new Error('ENOENT');
      });

      const size = getRouteSizeBytes('/', buildManifest, null, '/build-dir');
      expect(size).toBe(1024);
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
