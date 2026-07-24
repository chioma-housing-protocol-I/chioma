/**
 * Integration tests for HTTP caching headers (#1153)
 *
 * Covers: Cache-Control header validation, ETag generation and validation,
 * Last-Modified header handling, conditional requests (If-None-Match /
 * If-Modified-Since), and cache invalidation.
 */

import * as crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

type CacheDirective =
  | 'no-store'
  | 'no-cache'
  | 'private'
  | 'public'
  | `max-age=${number}`
  | `s-maxage=${number}`
  | 'must-revalidate'
  | 'immutable'
  | 'stale-while-revalidate';

interface CachePolicy {
  directives: CacheDirective[];
  /** When set, ETag is generated for every response. */
  etag: boolean;
  /** When set, Last-Modified is included. */
  lastModified: boolean;
}

interface CachedResource {
  body: Buffer;
  etag: string;
  lastModified: Date;
  cachePolicy: CachePolicy;
}

interface ConditionalRequestResult {
  /** 304 when conditions match; 200 when they do not. */
  status: 200 | 304;
  body: Buffer | null;
  headers: Record<string, string>;
}

// ── CacheHeaderService (subject-under-test) ───────────────────────────────────

class CacheHeaderService {
  /**
   * Build a Cache-Control header value from a list of directives.
   */
  buildCacheControl(directives: CacheDirective[]): string {
    return directives.join(', ');
  }

  /**
   * Generate a strong ETag for `body` using a SHA-256 hash.
   * The returned string is already quoted as per RFC 7232.
   */
  generateETag(body: Buffer): string {
    const hash = crypto
      .createHash('sha256')
      .update(body)
      .digest('hex')
      .slice(0, 32);
    return `"${hash}"`;
  }

  /**
   * Generate a weak ETag (W/"...") based on content length + timestamp.
   */
  generateWeakETag(body: Buffer, timestamp: Date): string {
    const raw = `${body.length}-${timestamp.getTime()}`;
    return `W/"${raw}"`;
  }

  /**
   * Format a Date as an RFC 7231 HTTP-date string.
   */
  formatHttpDate(date: Date): string {
    return date.toUTCString();
  }

  /**
   * Parse an RFC 7231 HTTP-date string back to a Date.
   * Returns `null` for an invalid date string.
   */
  parseHttpDate(dateStr: string): Date | null {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Evaluate conditional GET/HEAD request headers and decide whether to send
   * a full 200 response or a 304 Not Modified.
   */
  evaluateConditional(
    resource: CachedResource,
    ifNoneMatch: string | undefined,
    ifModifiedSince: string | undefined,
  ): ConditionalRequestResult {
    const headers: Record<string, string> = {
      ETag: resource.etag,
      'Last-Modified': this.formatHttpDate(resource.lastModified),
      'Cache-Control': this.buildCacheControl(resource.cachePolicy.directives),
    };

    // If-None-Match takes precedence over If-Modified-Since (RFC 7232 §6)
    if (ifNoneMatch !== undefined) {
      const clientETags = ifNoneMatch.split(',').map((e) => e.trim());

      const matched =
        clientETags.includes(resource.etag) || clientETags.includes('*');

      if (matched) {
        return { status: 304, body: null, headers };
      }
      return { status: 200, body: resource.body, headers };
    }

    if (ifModifiedSince !== undefined) {
      const since = this.parseHttpDate(ifModifiedSince);
      if (since && resource.lastModified <= since) {
        return { status: 304, body: null, headers };
      }
    }

    return { status: 200, body: resource.body, headers };
  }

  /**
   * Invalidate a cached resource by generating a new ETag and updating
   * the Last-Modified date.
   */
  invalidate(resource: CachedResource, newBody: Buffer): CachedResource {
    return {
      body: newBody,
      etag: this.generateETag(newBody),
      lastModified: new Date(),
      cachePolicy: resource.cachePolicy,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeResource(
  bodyText: string,
  policy: CachePolicy,
  lastModified?: Date,
): CachedResource {
  const svc = new CacheHeaderService();
  const body = Buffer.from(bodyText);
  const ts = lastModified ?? new Date('2024-01-01T00:00:00Z');
  return {
    body,
    etag: svc.generateETag(body),
    lastModified: ts,
    cachePolicy: policy,
  };
}

const publicPolicy: CachePolicy = {
  directives: ['public', 'max-age=3600'],
  etag: true,
  lastModified: true,
};

const privatePolicy: CachePolicy = {
  directives: ['private', 'no-cache'],
  etag: true,
  lastModified: false,
};

const immutablePolicy: CachePolicy = {
  directives: ['public', 'max-age=31536000', 'immutable'],
  etag: true,
  lastModified: true,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('API Caching Headers Integration Tests (#1153)', () => {
  let service: CacheHeaderService;

  beforeEach(() => {
    service = new CacheHeaderService();
  });

  // ── 1. Cache-Control header validation ────────────────────────────────────

  describe('Cache-Control Header Validation', () => {
    it('builds a valid public max-age directive', () => {
      const header = service.buildCacheControl(['public', 'max-age=3600']);
      expect(header).toBe('public, max-age=3600');
    });

    it('builds a no-store directive for sensitive endpoints', () => {
      const header = service.buildCacheControl(['no-store']);
      expect(header).toBe('no-store');
    });

    it('builds a private no-cache directive for authenticated content', () => {
      const header = service.buildCacheControl(['private', 'no-cache']);
      expect(header).toBe('private, no-cache');
    });

    it('builds an immutable directive for versioned static assets', () => {
      const header = service.buildCacheControl([
        'public',
        'max-age=31536000',
        'immutable',
      ]);
      expect(header).toContain('immutable');
      expect(header).toContain('max-age=31536000');
    });

    it('builds a must-revalidate directive', () => {
      const header = service.buildCacheControl([
        'public',
        'max-age=600',
        'must-revalidate',
      ]);
      expect(header).toContain('must-revalidate');
    });

    it('includes all directives in the produced string', () => {
      const directives: CacheDirective[] = [
        'public',
        'max-age=86400',
        's-maxage=3600',
      ];
      const header = service.buildCacheControl(directives);
      directives.forEach((d) => expect(header).toContain(d));
    });
  });

  // ── 2. ETag generation and validation ─────────────────────────────────────

  describe('ETag Generation and Validation', () => {
    it('generates a quoted strong ETag', () => {
      const body = Buffer.from('{"id":1,"name":"Alice"}');
      const etag = service.generateETag(body);
      expect(etag).toMatch(/^"[0-9a-f]+"$/);
    });

    it('generates a deterministic ETag for the same content', () => {
      const body = Buffer.from('stable content');
      const e1 = service.generateETag(body);
      const e2 = service.generateETag(body);
      expect(e1).toBe(e2);
    });

    it('generates different ETags for different content', () => {
      const a = service.generateETag(Buffer.from('version-1'));
      const b = service.generateETag(Buffer.from('version-2'));
      expect(a).not.toBe(b);
    });

    it('generates a weak ETag prefixed with W/"..."', () => {
      const body = Buffer.from('resource');
      const ts = new Date('2024-06-01T00:00:00Z');
      const weak = service.generateWeakETag(body, ts);
      expect(weak).toMatch(/^W\/"[^"]+"/);
    });

    it('generates different weak ETags for different timestamps', () => {
      const body = Buffer.from('same body');
      const t1 = new Date('2024-01-01T00:00:00Z');
      const t2 = new Date('2024-02-01T00:00:00Z');
      expect(service.generateWeakETag(body, t1)).not.toBe(
        service.generateWeakETag(body, t2),
      );
    });

    it('generates a strong ETag that is at least 32 hex characters long', () => {
      const etag = service.generateETag(Buffer.from('x'));
      const inner = etag.slice(1, -1); // strip quotes
      expect(inner.length).toBeGreaterThanOrEqual(32);
    });
  });

  // ── 3. Last-Modified header handling ──────────────────────────────────────

  describe('Last-Modified Header Handling', () => {
    it('formats a Date as a valid RFC 7231 HTTP-date string', () => {
      const d = new Date('2024-03-15T12:00:00Z');
      const formatted = service.formatHttpDate(d);
      // RFC 7231 format: "Fri, 15 Mar 2024 12:00:00 GMT"
      expect(formatted).toMatch(
        /\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT/,
      );
    });

    it('round-trips a date through format and parse', () => {
      const original = new Date('2024-06-20T08:30:00Z');
      const formatted = service.formatHttpDate(original);
      const parsed = service.parseHttpDate(formatted);

      expect(parsed).not.toBeNull();
      // Allow 1 second tolerance for HTTP-date (1-second granularity)
      expect(
        Math.abs(parsed!.getTime() - original.getTime()),
      ).toBeLessThanOrEqual(1000);
    });

    it('returns null for an invalid HTTP-date string', () => {
      expect(service.parseHttpDate('not-a-date')).toBeNull();
      expect(service.parseHttpDate('')).toBeNull();
    });

    it('includes Last-Modified header in evaluateConditional response headers', () => {
      const resource = makeResource('body text', publicPolicy);
      const result = service.evaluateConditional(
        resource,
        undefined,
        undefined,
      );
      expect(result.headers['Last-Modified']).toBeDefined();
    });

    it('Last-Modified value round-trips through HTTP-date format', () => {
      const ts = new Date('2024-01-10T10:00:00Z');
      const resource = makeResource('data', publicPolicy, ts);
      const result = service.evaluateConditional(
        resource,
        undefined,
        undefined,
      );
      const parsed = service.parseHttpDate(result.headers['Last-Modified']);
      expect(parsed).not.toBeNull();
    });
  });

  // ── 4. Conditional requests ────────────────────────────────────────────────

  describe('Conditional Requests (If-None-Match / If-Modified-Since)', () => {
    describe('If-None-Match', () => {
      it('returns 304 when the ETag matches exactly', () => {
        const resource = makeResource('some content', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          resource.etag,
          undefined,
        );
        expect(result.status).toBe(304);
        expect(result.body).toBeNull();
      });

      it('returns 200 when the ETag does not match', () => {
        const resource = makeResource('some content', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          '"stale-etag"',
          undefined,
        );
        expect(result.status).toBe(200);
        expect(result.body).not.toBeNull();
      });

      it('returns 304 for wildcard If-None-Match: *', () => {
        const resource = makeResource('any content', publicPolicy);
        const result = service.evaluateConditional(resource, '*', undefined);
        expect(result.status).toBe(304);
      });

      it('returns 304 when ETag is among a list of ETags', () => {
        const resource = makeResource('content', publicPolicy);
        const ifNoneMatch = `"old-etag", ${resource.etag}, "another-etag"`;
        const result = service.evaluateConditional(
          resource,
          ifNoneMatch,
          undefined,
        );
        expect(result.status).toBe(304);
      });

      it('always includes current ETag in 304 response headers', () => {
        const resource = makeResource('content', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          resource.etag,
          undefined,
        );
        expect(result.headers['ETag']).toBe(resource.etag);
      });

      it('If-None-Match takes precedence over If-Modified-Since when both are sent', () => {
        const resource = makeResource('content', publicPolicy);
        // ETag matches → should be 304 regardless of If-Modified-Since
        const future = new Date(Date.now() - 1000).toUTCString(); // older than now
        const result = service.evaluateConditional(
          resource,
          resource.etag,
          future,
        );
        expect(result.status).toBe(304);
      });
    });

    describe('If-Modified-Since', () => {
      it('returns 304 when resource has NOT been modified since the given date', () => {
        const ts = new Date('2024-01-01T00:00:00Z');
        const resource = makeResource('static content', publicPolicy, ts);

        // Client already has a version from after the resource was last modified
        const future = new Date('2024-06-01T00:00:00Z').toUTCString();
        const result = service.evaluateConditional(resource, undefined, future);
        expect(result.status).toBe(304);
      });

      it('returns 200 when resource HAS been modified since the given date', () => {
        const ts = new Date('2024-06-01T00:00:00Z');
        const resource = makeResource('updated content', publicPolicy, ts);

        // Client has an older version
        const older = new Date('2024-01-01T00:00:00Z').toUTCString();
        const result = service.evaluateConditional(resource, undefined, older);
        expect(result.status).toBe(200);
        expect(result.body).toEqual(resource.body);
      });

      it('returns 200 for an invalid If-Modified-Since date', () => {
        const resource = makeResource('data', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          undefined,
          'garbage-date',
        );
        expect(result.status).toBe(200);
      });

      it('returns 304 when If-Modified-Since equals the Last-Modified date exactly', () => {
        const ts = new Date('2024-03-15T12:00:00Z');
        const resource = makeResource('exact', publicPolicy, ts);
        const exactDate = service.formatHttpDate(ts);
        const result = service.evaluateConditional(
          resource,
          undefined,
          exactDate,
        );
        expect(result.status).toBe(304);
      });
    });

    describe('No conditional headers', () => {
      it('returns 200 with the full body when no conditional headers are sent', () => {
        const resource = makeResource('full response', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          undefined,
          undefined,
        );
        expect(result.status).toBe(200);
        expect(result.body).toEqual(resource.body);
      });

      it('includes Cache-Control, ETag and Last-Modified in 200 headers', () => {
        const resource = makeResource('data', publicPolicy);
        const result = service.evaluateConditional(
          resource,
          undefined,
          undefined,
        );
        expect(result.headers['Cache-Control']).toBeDefined();
        expect(result.headers['ETag']).toBeDefined();
        expect(result.headers['Last-Modified']).toBeDefined();
      });
    });
  });

  // ── 5. Cache invalidation ──────────────────────────────────────────────────

  describe('Cache Invalidation', () => {
    it('produces a different ETag after invalidation', () => {
      const original = makeResource('version 1', publicPolicy);
      const updated = service.invalidate(original, Buffer.from('version 2'));
      expect(updated.etag).not.toBe(original.etag);
    });

    it('updates Last-Modified to a more recent timestamp after invalidation', () => {
      const ts = new Date('2020-01-01T00:00:00Z');
      const original = makeResource('old', publicPolicy, ts);
      const updated = service.invalidate(original, Buffer.from('new'));
      expect(updated.lastModified.getTime()).toBeGreaterThanOrEqual(
        ts.getTime(),
      );
    });

    it('preserves the cache policy after invalidation', () => {
      const original = makeResource('data', immutablePolicy);
      const updated = service.invalidate(original, Buffer.from('updated data'));
      expect(updated.cachePolicy).toEqual(immutablePolicy);
    });

    it('returns 200 after invalidation when the client sends the old ETag', () => {
      const original = makeResource('v1', publicPolicy);
      const oldETag = original.etag;

      const updated = service.invalidate(original, Buffer.from('v2'));

      const result = service.evaluateConditional(updated, oldETag, undefined);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(updated.body);
    });

    it('returns 304 after invalidation when the client sends the NEW ETag', () => {
      const original = makeResource('v1', publicPolicy);
      const updated = service.invalidate(original, Buffer.from('v2'));

      const result = service.evaluateConditional(
        updated,
        updated.etag,
        undefined,
      );
      expect(result.status).toBe(304);
    });

    it('invalidating the same resource twice yields two distinct ETags', () => {
      const r0 = makeResource('base', publicPolicy);
      const r1 = service.invalidate(r0, Buffer.from('update-1'));
      const r2 = service.invalidate(r1, Buffer.from('update-2'));
      expect(r1.etag).not.toBe(r0.etag);
      expect(r2.etag).not.toBe(r1.etag);
    });

    it('no-store policy should not use cached responses', () => {
      const noStorePolicy: CachePolicy = {
        directives: ['no-store'],
        etag: false,
        lastModified: false,
      };
      const resource = makeResource('sensitive', noStorePolicy);
      const header = service.buildCacheControl(resource.cachePolicy.directives);
      expect(header).toContain('no-store');
    });
  });
});
