import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Rate limiting middleware for authentication endpoints
 * Limits requests by IP address
 */
@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(private readonly configService: ConfigService) {
    this.windowMs = this.parsePositiveInt(
      this.configService.get<string>('AUTH_RATE_LIMIT_WINDOW_MS'),
      15 * 60 * 1000,
    );
    this.maxRequests = this.parsePositiveInt(
      this.configService.get<string>('AUTH_RATE_LIMIT_MAX_REQUESTS'),
      5,
    );
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientIp(req);
    const now = Date.now();

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return next();
    }

    const record = this.store[key];

    // Reset if window has passed
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + this.windowMs;
      return next();
    }

    // Check if limit exceeded
    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw new HttpException(
        `Too many authentication attempts. Please try again in ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
  ): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
