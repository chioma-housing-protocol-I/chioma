import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

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
      `Processed image: thumbnail=${thumbnailBuffer.length}B, medium=${mediumBuffer.length}B, webp=${webpBuffer.length}B`,
    );

    return {
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
}
