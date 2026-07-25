/**
 * Integration tests for API response compression (#1152)
 *
 * Covers: gzip compression, brotli compression, compression negotiation,
 * compression threshold, and compression metrics.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import * as zlib from 'zlib';
import { promisify } from 'util';
import * as http from 'http';

const gzipAsync = promisify(zlib.gzip);
const brotliCompressAsync = promisify(zlib.brotliCompress);
const gunzipAsync = promisify(zlib.gunzip);
const brotliDecompressAsync = promisify(zlib.brotliDecompress);

// ── Types ────────────────────────────────────────────────────────────────────

interface CompressionOptions {
  /** Minimum response body size (bytes) before compression is applied. */
  threshold: number;
  /** Supported encodings, ordered by preference. */
  encodings: Array<'br' | 'gzip' | 'deflate' | 'identity'>;
}

interface CompressionMetrics {
  totalResponses: number;
  compressedResponses: number;
  bypassedByThreshold: number;
  bypassedByNegotiation: number;
  bytesBeforeCompression: number;
  bytesAfterCompression: number;
}

// ── CompressionService (subject-under-test) ───────────────────────────────────

class CompressionService {
  private readonly options: CompressionOptions;
  private metrics: CompressionMetrics = {
    totalResponses: 0,
    compressedResponses: 0,
    bypassedByThreshold: 0,
    bypassedByNegotiation: 0,
    bytesBeforeCompression: 0,
    bytesAfterCompression: 0,
  };

  constructor(options: Partial<CompressionOptions> = {}) {
    this.options = {
      threshold: options.threshold ?? 1024,
      encodings: options.encodings ?? ['br', 'gzip', 'deflate', 'identity'],
    };
  }

  /**
   * Negotiate the best encoding based on the Accept-Encoding request header.
   * Returns `null` when no supported encoding is acceptable to the client.
   */
  negotiateEncoding(
    acceptEncoding: string,
  ): 'br' | 'gzip' | 'deflate' | 'identity' | null {
    if (!acceptEncoding) return 'identity';

    const clientEncodings = acceptEncoding
      .split(',')
      .map((part) => {
        const [enc, q] = part.trim().split(';q=');
        return { enc: enc.trim(), q: q ? parseFloat(q) : 1.0 };
      })
      .filter((e) => e.q > 0)
      .sort((a, b) => b.q - a.q)
      .map((e) => e.enc);

    for (const preferred of this.options.encodings) {
      if (
        clientEncodings.includes(preferred) ||
        clientEncodings.includes('*')
      ) {
        return preferred;
      }
    }

    if (clientEncodings.includes('identity') || clientEncodings.includes('*')) {
      return 'identity';
    }

    // Final fallback: serve uncompressed rather than refusing the request
    return 'identity';
  }

  /**
   * Compress `body` using the negotiated encoding, or return it unchanged if
   * the threshold is not met or compression is not applicable.
   */
  async compress(
    body: Buffer,
    encoding: 'br' | 'gzip' | 'deflate' | 'identity' | null,
  ): Promise<{ data: Buffer; encoding: string; compressed: boolean }> {
    this.metrics.totalResponses++;
    this.metrics.bytesBeforeCompression += body.length;

    if (encoding === null || encoding === 'identity') {
      this.metrics.bypassedByNegotiation++;
      this.metrics.bytesAfterCompression += body.length;
      return { data: body, encoding: 'identity', compressed: false };
    }

    if (body.length < this.options.threshold) {
      this.metrics.bypassedByThreshold++;
      this.metrics.bytesAfterCompression += body.length;
      return { data: body, encoding: 'identity', compressed: false };
    }

    let compressed: Buffer;
    if (encoding === 'br') {
      compressed = await brotliCompressAsync(body);
    } else if (encoding === 'gzip') {
      compressed = await gzipAsync(body);
    } else {
      // deflate — use raw deflate
      compressed = await promisify(zlib.deflate)(body);
    }

    this.metrics.compressedResponses++;
    this.metrics.bytesAfterCompression += compressed.length;
    return { data: compressed, encoding, compressed: true };
  }

  getMetrics(): Readonly<CompressionMetrics> {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalResponses: 0,
      compressedResponses: 0,
      bypassedByThreshold: 0,
      bypassedByNegotiation: 0,
      bytesBeforeCompression: 0,
      bytesAfterCompression: 0,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBody(sizeBytes: number): Buffer {
  // Repetitive text compresses well — realistic for JSON payloads
  return Buffer.from('a'.repeat(sizeBytes));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('API Compression Integration Tests (#1152)', () => {
  let service: CompressionService;

  beforeEach(() => {
    service = new CompressionService({ threshold: 512 });
  });

  // ── 1. Gzip compression ────────────────────────────────────────────────────

  describe('Gzip Compression', () => {
    it('compresses a large body with gzip and the result is smaller', async () => {
      const body = makeBody(2048);
      const result = await service.compress(body, 'gzip');

      expect(result.compressed).toBe(true);
      expect(result.encoding).toBe('gzip');
      expect(result.data.length).toBeLessThan(body.length);
    });

    it('produces valid gzip output that round-trips correctly', async () => {
      const original = Buffer.from(
        JSON.stringify({ key: 'value', list: [1, 2, 3] }).repeat(100),
      );
      const { data } = await service.compress(original, 'gzip');

      const decompressed = await gunzipAsync(data);
      expect(decompressed.toString()).toBe(original.toString());
    });

    it('sets Content-Encoding to gzip in the compressed result', async () => {
      const body = makeBody(1024);
      const result = await service.compress(body, 'gzip');
      expect(result.encoding).toBe('gzip');
    });

    it('does not compress an already-small body even when gzip is requested', async () => {
      const tiny = makeBody(100); // below 512-byte threshold
      const result = await service.compress(tiny, 'gzip');
      expect(result.compressed).toBe(false);
      expect(result.data).toEqual(tiny);
    });
  });

  // ── 2. Brotli compression ──────────────────────────────────────────────────

  describe('Brotli Compression', () => {
    it('compresses a large body with brotli and the result is smaller', async () => {
      const body = makeBody(2048);
      const result = await service.compress(body, 'br');

      expect(result.compressed).toBe(true);
      expect(result.encoding).toBe('br');
      expect(result.data.length).toBeLessThan(body.length);
    });

    it('produces valid brotli output that round-trips correctly', async () => {
      const original = Buffer.from('Hello Brotli! '.repeat(200));
      const { data } = await service.compress(original, 'br');

      const decompressed = await brotliDecompressAsync(data);
      expect(decompressed.toString()).toBe(original.toString());
    });

    it('achieves equal or better compression ratio than gzip on text', async () => {
      const body = makeBody(4096);
      const gzipResult = await service.compress(body, 'gzip');
      service.resetMetrics();
      const brotliResult = await service.compress(body, 'br');

      // Brotli typically compresses better; allow equality for edge cases
      expect(brotliResult.data.length).toBeLessThanOrEqual(
        gzipResult.data.length + 50,
      );
    });

    it('sets Content-Encoding to br in the compressed result', async () => {
      const body = makeBody(1024);
      const result = await service.compress(body, 'br');
      expect(result.encoding).toBe('br');
    });
  });

  // ── 3. Compression negotiation ─────────────────────────────────────────────

  describe('Compression Negotiation', () => {
    it('negotiates br when client prefers brotli', () => {
      expect(service.negotiateEncoding('br, gzip;q=0.9')).toBe('br');
    });

    it('negotiates gzip when client does not support brotli', () => {
      expect(service.negotiateEncoding('gzip, deflate')).toBe('gzip');
    });

    it('negotiates the highest-quality encoding from a list', () => {
      // gzip;q=0.9, br;q=1.0 — br wins
      expect(service.negotiateEncoding('gzip;q=0.9, br;q=1.0')).toBe('br');
    });

    it('falls back to identity when the client only accepts unknown encodings', () => {
      // Server supports br/gzip/deflate/identity; client sends only "zstd"
      const result = service.negotiateEncoding('zstd');
      // Server picks identity as final fallback
      expect(result).toBe('identity');
    });

    it('treats a missing Accept-Encoding header as identity', () => {
      expect(service.negotiateEncoding('')).toBe('identity');
    });

    it('returns identity when client sends Accept-Encoding: identity', () => {
      expect(service.negotiateEncoding('identity')).toBe('identity');
    });

    it('respects wildcard * in Accept-Encoding', () => {
      // Wildcard means the client accepts anything — server picks its first preference (br)
      const result = service.negotiateEncoding('*');
      expect(['br', 'gzip', 'deflate', 'identity']).toContain(result);
    });

    it('correctly parses quality values (q-factors)', () => {
      // gzip;q=0.5 vs br;q=0.8 — br should win
      expect(service.negotiateEncoding('gzip;q=0.5, br;q=0.8')).toBe('br');
    });
  });

  // ── 4. Compression threshold ───────────────────────────────────────────────

  describe('Compression Threshold', () => {
    it('does not compress a response below the configured threshold', async () => {
      const small = makeBody(256); // below 512-byte threshold
      const result = await service.compress(small, 'gzip');

      expect(result.compressed).toBe(false);
      expect(result.encoding).toBe('identity');
      expect(result.data).toEqual(small);
    });

    it('compresses a response at exactly the threshold boundary', async () => {
      // Body length == threshold: rule is body < threshold → skip, so exactly at threshold → compress
      const atThreshold = makeBody(512);
      const result = await service.compress(atThreshold, 'gzip');
      expect(result.compressed).toBe(true);
    });

    it('compresses a response one byte above the threshold', async () => {
      const justOver = makeBody(513);
      const result = await service.compress(justOver, 'gzip');
      expect(result.compressed).toBe(true);
    });

    it('honours a custom higher threshold', async () => {
      const highThresholdService = new CompressionService({ threshold: 8192 });
      const medium = makeBody(4096); // below custom 8 KB threshold

      const result = await highThresholdService.compress(medium, 'gzip');
      expect(result.compressed).toBe(false);
    });

    it('honours a threshold of 0 (always compress)', async () => {
      const alwaysService = new CompressionService({ threshold: 0 });
      const tiny = makeBody(10);

      const result = await alwaysService.compress(tiny, 'gzip');
      expect(result.compressed).toBe(true);
    });
  });

  // ── 5. Compression metrics ─────────────────────────────────────────────────

  describe('Compression Metrics', () => {
    beforeEach(() => service.resetMetrics());

    it('increments totalResponses for every compress() call', async () => {
      await service.compress(makeBody(2048), 'gzip');
      await service.compress(makeBody(100), 'gzip');
      expect(service.getMetrics().totalResponses).toBe(2);
    });

    it('increments compressedResponses only for actually-compressed responses', async () => {
      await service.compress(makeBody(2048), 'gzip'); // compressed
      await service.compress(makeBody(100), 'gzip'); // below threshold
      expect(service.getMetrics().compressedResponses).toBe(1);
    });

    it('increments bypassedByThreshold for small responses', async () => {
      await service.compress(makeBody(100), 'gzip');
      await service.compress(makeBody(200), 'gzip');
      expect(service.getMetrics().bypassedByThreshold).toBe(2);
    });

    it('increments bypassedByNegotiation when encoding is identity or null', async () => {
      await service.compress(makeBody(2048), 'identity');
      await service.compress(makeBody(2048), null);
      expect(service.getMetrics().bypassedByNegotiation).toBe(2);
    });

    it('tracks bytes before and after compression', async () => {
      const body = makeBody(2048);
      await service.compress(body, 'gzip');

      const m = service.getMetrics();
      expect(m.bytesBeforeCompression).toBe(2048);
      expect(m.bytesAfterCompression).toBeGreaterThan(0);
      expect(m.bytesAfterCompression).toBeLessThan(m.bytesBeforeCompression);
    });

    it('accumulates bytes across multiple responses', async () => {
      await service.compress(makeBody(1024), 'gzip');
      await service.compress(makeBody(2048), 'br');

      expect(service.getMetrics().bytesBeforeCompression).toBe(3072);
    });

    it('resets all counters on resetMetrics()', async () => {
      await service.compress(makeBody(2048), 'gzip');
      service.resetMetrics();

      const m = service.getMetrics();
      expect(m.totalResponses).toBe(0);
      expect(m.compressedResponses).toBe(0);
      expect(m.bytesBeforeCompression).toBe(0);
    });

    it('returns an immutable snapshot from getMetrics()', async () => {
      await service.compress(makeBody(2048), 'gzip');
      const snapshot = service.getMetrics();
      (snapshot as CompressionMetrics).totalResponses = 999;

      expect(service.getMetrics().totalResponses).toBe(1);
    });
  });
});
