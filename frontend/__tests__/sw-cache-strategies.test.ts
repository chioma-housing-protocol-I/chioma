import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * public/sw.js is a plain service-worker script (self/addEventListener/
 * caches globals), not an ES module, so it can't be `import`ed directly.
 * This loads its source into a sandboxed function scope with mocked
 * service-worker globals and pulls out `cacheFirst` to test the strategy
 * added for #2082 in isolation, the same way the file itself is loaded
 * into the browser's isolated service-worker global scope.
 */
function loadServiceWorkerFunctions() {
  const source = readFileSync(
    path.join(__dirname, '..', 'public', 'sw.js'),
    'utf-8',
  );

  const self: Record<string, unknown> = { addEventListener: vi.fn() };
  const sandbox = new Function(
    'self',
    'caches',
    'fetch',
    'Response',
    `${source}\nreturn { cacheFirst, staleWhileRevalidate, networkFirst };`,
  );

  const mockCache = {
    match: vi.fn(),
    put: vi.fn(),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(mockCache),
  };

  return { sandbox, self, caches, mockCache };
}

describe('sw.js cacheFirst (#2082)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('returns the cached response without calling fetch when present', async () => {
    const { sandbox, self, caches, mockCache } = loadServiceWorkerFunctions();
    const cachedResponse = { cached: true };
    mockCache.match.mockResolvedValue(cachedResponse);

    const { cacheFirst } = sandbox(self, caches, fetchMock, class {});

    const result = await cacheFirst({ url: '/_next/static/chunk.js' });

    expect(result).toBe(cachedResponse);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the network and caches the response on a miss', async () => {
    const { sandbox, self, caches, mockCache } = loadServiceWorkerFunctions();
    mockCache.match.mockResolvedValue(undefined);
    const networkResponse = { clone: vi.fn().mockReturnValue('cloned') };
    fetchMock.mockResolvedValue(networkResponse);

    const { cacheFirst } = sandbox(self, caches, fetchMock, class {});

    const request = { url: '/_next/static/chunk.js' };
    const result = await cacheFirst(request);

    expect(fetchMock).toHaveBeenCalledWith(request);
    expect(mockCache.put).toHaveBeenCalledWith(request, 'cloned');
    expect(result).toBe(networkResponse);
  });

  it('returns Response.error() when both cache and network miss', async () => {
    const { sandbox, self, caches, mockCache } = loadServiceWorkerFunctions();
    mockCache.match.mockResolvedValue(undefined);
    fetchMock.mockRejectedValue(new Error('offline'));
    class FakeResponse {
      static error() {
        return 'network-error-response';
      }
    }

    const { cacheFirst } = sandbox(self, caches, fetchMock, FakeResponse);

    const result = await cacheFirst({ url: '/_next/static/chunk.js' });

    expect(result).toBe('network-error-response');
  });
});
