import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

export interface ImageVariant {
  key: string;
  buffer: Buffer;
  contentType: string;
  size: number;
}

export interface ProcessImageResult {
  original: ImageVariant;
  thumbnail: ImageVariant;
  medium: ImageVariant;
  webp: ImageVariant;
}

/** Metrics snapshot returned by getCacheMetrics(). */
export interface ImageCacheMetrics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

/**
 * Simple LRU node used by the in-process variant cache.
 */
interface LruNode {
  hash: string;
  result: ProcessImageResult;
  prev: LruNode | null;
  next: LruNode | null;
}

/**
 * In-process LRU cache keyed by SHA-256 hash of the raw image buffer.
 * Avoids re-running sharp transforms for duplicate uploads within the
 * same process lifetime (e.g. retried multipart requests or reused assets).
 *
 * The default capacity of 128 entries fits comfortably within typical Node.js
 * heap budgets while still covering burst duplicate-upload scenarios.
 */
class ImageVariantLruCache {
  private readonly map = new Map<string, LruNode>();
  private head: LruNode | null = null; // most-recently used
  private tail: LruNode | null = null; // least-recently used
  private hits = 0;
  private misses = 0;

  constructor(private readonly maxSize: number) {}

  get(hash: string): ProcessImageResult | undefined {
    const node = this.map.get(hash);
    if (!node) {
      this.misses++;
      return undefined;
    }
    this.hits++;
    this.moveToHead(node);
    return node.result;
  }

  set(hash: string, result: ProcessImageResult): void {
    if (this.map.has(hash)) {
      const node = this.map.get(hash)!;
      node.result = result;
      this.moveToHead(node);
      return;
    }

    const node: LruNode = { hash, result, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.map.set(hash, node);

    if (this.map.size > this.maxSize) {
      this.evictTail();
    }
  }

  getMetrics(): ImageCacheMetrics {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.map.size,
      maxSize: this.maxSize,
    };
  }

  private moveToHead(node: LruNode): void {
    if (node === this.head) return;
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }

  private evictTail(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.hash);
    if (this.tail.prev) this.tail.prev.next = null;
    this.tail = this.tail.prev;
    if (!this.tail) this.head = null;
  }
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * LRU cache: SHA-256(buffer) → processed variants.
   * Capacity: 128 entries (override via IMAGE_CACHE_MAX_SIZE env var).
   */
  private readonly cache = new ImageVariantLruCache(
    parseInt(process.env.IMAGE_CACHE_MAX_SIZE ?? '128', 10),
  );

  async processImage(
    buffer: Buffer,
    originalKey: string,
    contentType: string,
  ): Promise<ProcessImageResult> {
    const baseKey = originalKey.replace(/\.[^.]+$/, '');

    // Determine if this is an image we can process
    const isImage = contentType.startsWith('image/');
    if (!isImage) {
      throw new Error('Not an image file');
    }

    // --- Cache lookup by content hash -----------------------------------
    // The cache key is derived from the raw pixel data, not the filename,
    // so duplicate uploads (same bytes, different keys) get a cache hit.
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const cached = this.cache.get(hash);
    if (cached) {
      this.logger.debug(`Image cache hit for hash ${hash.slice(0, 12)}…`);
      // Re-stamp keys for the new upload path so S3 targets are correct.
      return {
        original: { ...cached.original, key: originalKey },
        thumbnail: { ...cached.thumbnail, key: `${baseKey}_thumb.jpg` },
        medium: { ...cached.medium, key: `${baseKey}_medium.jpg` },
        webp: { ...cached.webp, key: `${baseKey}.webp` },
      };
    }

    // --- Cache miss: run sharp transforms --------------------------------
    const [thumbnailBuffer, mediumBuffer, webpBuffer] = await Promise.all([
      // 150x150 thumbnail
      sharp(buffer)
        .resize(150, 150, { fit: 'cover', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer(),
      // 800px wide medium
      sharp(buffer)
        .resize(800, null, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer(),
      // WebP optimized for web
      sharp(buffer)
        .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
    ]);

    this.logger.log(
      `Processed image (cache miss): thumbnail=${thumbnailBuffer.length}B, medium=${mediumBuffer.length}B, webp=${webpBuffer.length}B`,
    );

    const result: ProcessImageResult = {
      original: {
        key: originalKey,
        buffer,
        contentType,
        size: buffer.length,
      },
      thumbnail: {
        key: `${baseKey}_thumb.jpg`,
        buffer: thumbnailBuffer,
        contentType: 'image/jpeg',
        size: thumbnailBuffer.length,
      },
      medium: {
        key: `${baseKey}_medium.jpg`,
        buffer: mediumBuffer,
        contentType: 'image/jpeg',
        size: mediumBuffer.length,
      },
      webp: {
        key: `${baseKey}.webp`,
        buffer: webpBuffer,
        contentType: 'image/webp',
        size: webpBuffer.length,
      },
    };

    this.cache.set(hash, result);
    return result;
  }

  async getImageMetadata(
    buffer: Buffer,
  ): Promise<{ width: number; height: number; format: string }> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: metadata.format ?? 'unknown',
    };
  }

  /** Returns cache hit/miss metrics for observability endpoints. */
  getCacheMetrics(): ImageCacheMetrics {
    return this.cache.getMetrics();
  }
}
