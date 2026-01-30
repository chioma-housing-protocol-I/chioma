import {
  Injectable,
  NestMiddleware,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Request size limiting middleware
 * Rejects oversized requests early to prevent DoS attacks
 */
@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly jsonLimit: string;
  private readonly urlencodedLimit: string;
  private readonly multipartLimit: string;

  constructor(private configService: ConfigService) {
    this.jsonLimit =
      this.configService.get<string>('REQUEST_SIZE_LIMIT_JSON') || '1mb';
    this.urlencodedLimit =
      this.configService.get<string>('REQUEST_SIZE_LIMIT_URLENCODED') || '1mb';
    this.multipartLimit =
      this.configService.get<string>('REQUEST_SIZE_LIMIT_MULTIPART') || '10mb';
  }

  use(req: Request, res: Response, next: NextFunction) {
    const contentType = req.headers['content-type'] || '';

    // Check content length header if present
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      let maxSize: number;

      if (contentType.includes('multipart/form-data')) {
        maxSize = this.parseSize(this.multipartLimit);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        maxSize = this.parseSize(this.urlencodedLimit);
      } else if (
        contentType.includes('application/json') ||
        contentType.includes('text/')
      ) {
        maxSize = this.parseSize(this.jsonLimit);
      } else {
        maxSize = this.parseSize(this.jsonLimit); // Default to JSON limit
      }

      if (size > maxSize) {
        throw new PayloadTooLargeException(
          `Request entity too large. Maximum size is ${this.formatSize(maxSize)}`,
        );
      }
    }

    next();
  }

  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    const match = size.toLowerCase().match(/^(\d+)(kb|mb|gb)?$/);
    if (!match) {
      return 1024 * 1024; // Default to 1MB
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'b';

    return value * (units[unit] || 1);
  }

  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)}KB`;
    }
    return `${bytes}B`;
  }
}
