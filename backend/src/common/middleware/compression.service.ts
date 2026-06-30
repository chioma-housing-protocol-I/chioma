import { Injectable } from '@nestjs/common';
import { promisify } from 'util';
import * as zlib from 'zlib';

const gzipAsync = promisify(zlib.gzip);
const brotliCompressAsync = promisify(zlib.brotliCompress);
const deflateAsync = promisify(zlib.deflate);

export type SupportedEncoding = 'br' | 'gzip' | 'deflate' | 'identity';

export interface CompressionOptions {
  threshold: number;
  encodings: SupportedEncoding[];
}

export interface CompressionMetrics {
  totalResponses: number;
  compressedResponses: number;
  bypassedByThreshold: number;
  bypassedByNegotiation: number;
  bytesBeforeCompression: number;
  bytesAfterCompression: number;
}

@Injectable()
export class CompressionService {
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

  negotiateEncoding(acceptEncoding: string): SupportedEncoding {
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

    return 'identity';
  }

  async compress(
    body: Buffer,
    encoding: SupportedEncoding | null,
  ): Promise<{ data: Buffer; encoding: string; compressed: boolean }> {
    this.metrics.totalResponses++;
    this.metrics.bytesBeforeCompression += body.length;

    if (!encoding || encoding === 'identity') {
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
      compressed = await deflateAsync(body);
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
