/**
 * Unit tests for the service worker's fetch-handling strategies (#2041):
 * network-first for API calls, stale-while-revalidate for static assets,
 * and the navigation offline fallback. `public/sw.js` runs in the Service
 * Worker global scope, not in a browser tab or in Node, so it can't be
 * imported as a module; it's loaded here with `self`/`caches`/`fetch`
 * stubbed to the minimum surface the file actually calls, letting its
 * real fetch-handler and helper functions run unmodified against
 * fully-controlled cache and network responses.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

interface FakeCache {
  store: Map<string, Response>;
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

function makeFakeCache(): FakeCache {
  const store = new Map<string, Response>();
  return {
    store,
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      return store.get(key);
    },
    async put(request, response) {
      const key = typeof request === 'string' ? request : request.url;
      store.set(key, response);
    },
  };
}

type FetchHandler = (event: {
  request: Request;
  respondWith: (p: Promise<Response>) => void;
}) => void;

/**
 * Loads public/sw.js into a sandboxed `self` object, capturing the
 * registered `fetch` event listener so tests can invoke it directly with
 * a synthetic FetchEvent-like object.
 */
function loadServiceWorker(options: {
  fetchImpl: (request: Request) => Promise<Response>;
  cache: FakeCache;
}): FetchHandler {
  const listeners: Record<string, ((event: unknown) => void)[]> = {};
  const fakeSelf = {
    location: { origin: 'http://localhost:3101' },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(handler);
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };

  const fakeCaches = {
    open: async () => options.cache,
    match: (request: Request | string) => options.cache.match(request),
    keys: async () => [],
    delete: vi.fn(),
  };

  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf-8');

  const run = new Function('self', 'caches', 'fetch', 'Response', source);
  run(fakeSelf, fakeCaches, options.fetchImpl, Response);

  const fetchHandlers = listeners['fetch'];
  expect(fetchHandlers).toHaveLength(1);

  return (event) => fetchHandlers[0](event);
}

function dispatchFetch(
  handler: FetchHandler,
  request: Request,
): Promise<Response> {
  let captured: Promise<Response> | undefined;
  handler({
    request,
    respondWith: (p) => {
      captured = p;
    },
  });
  return captured!;
}

/** `mode: 'navigate'` can't be set via the Request constructor (the spec
 * reserves it for real browser navigations), so it's patched on afterward. */
function navigationRequest(url: string): Request {
  const request = new Request(url);
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  return request;
}

describe('service worker fetch handling (public/sw.js)', () => {
  let cache: FakeCache;

  beforeEach(() => {
    cache = makeFakeCache();
  });

  describe('API requests (network-first, offline JSON fallback)', () => {
    it('passes through the real network response when online', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const response = await dispatchFetch(
        handler,
        new Request('http://localhost:3101/api/properties/1'),
      );

      expect(await response.text()).toBe('{"ok":true}');
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('returns a structured offline JSON response when the network fails', async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const response = await dispatchFetch(
        handler,
        new Request('http://localhost:3101/api/properties/1'),
      );

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body).toEqual({ error: 'Offline', offline: true });
    });
  });

  describe('navigation requests (offline fallback page)', () => {
    it('serves the live page and caches it when online', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response('<html>home</html>'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const request = navigationRequest('http://localhost:3101/');
      const response = await dispatchFetch(handler, request);

      expect(await response.text()).toBe('<html>home</html>');
      expect(cache.store.has(request.url)).toBe(true);
    });

    it('serves a previously-cached copy of the same page when offline (cache hit)', async () => {
      const request = navigationRequest('http://localhost:3101/properties');
      await cache.put(request, new Response('<html>cached properties</html>'));
      const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const response = await dispatchFetch(handler, request);

      expect(await response.text()).toBe('<html>cached properties</html>');
    });

    it('falls back to the offline page when offline and the page was never cached (cache miss)', async () => {
      await cache.put('/offline', new Response('<html>you are offline</html>'));
      const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const request = navigationRequest('http://localhost:3101/never-visited');
      const response = await dispatchFetch(handler, request);

      expect(await response.text()).toBe('<html>you are offline</html>');
    });
  });

  describe('static assets (stale-while-revalidate)', () => {
    it('serves the cached asset immediately without waiting on the network (cache hit)', async () => {
      const request = new Request('http://localhost:3101/app.css', {
        destination: 'style',
      } as RequestInit as Request);
      Object.defineProperty(request, 'destination', { value: 'style' });
      await cache.put(request, new Response('.old{}'));

      let resolveFetch: (r: Response) => void;
      const fetchImpl = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      );
      const handler = loadServiceWorker({ fetchImpl, cache });

      const response = await dispatchFetch(handler, request);
      expect(await response.text()).toBe('.old{}');

      // Network update still happens in the background (revalidation).
      resolveFetch!(new Response('.new{}'));
    });

    it('falls back to the network when there is no cached copy yet (cache miss)', async () => {
      const request = new Request('http://localhost:3101/app.css', {
        destination: 'style',
      } as RequestInit as Request);
      Object.defineProperty(request, 'destination', { value: 'style' });
      const fetchImpl = vi.fn().mockResolvedValue(new Response('.fresh{}'));
      const handler = loadServiceWorker({ fetchImpl, cache });

      const response = await dispatchFetch(handler, request);

      expect(await response.text()).toBe('.fresh{}');
    });
  });
});
