import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Middleware that limits the depth of objects in the request body and query parameters.
 * Prevents Denial of Service (DoS) attacks from deeply nested or recursive payloads.
 */
@Injectable()
export class QueryDepthLimitMiddleware implements NestMiddleware {
  private readonly maxDepth: number;

  constructor(private readonly configService: ConfigService) {
    const depthVal = this.configService.get<string>('QUERY_MAX_DEPTH');
    this.maxDepth = depthVal ? parseInt(depthVal, 10) : 10;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.body) {
      const bodyDepth = this.getDepth(req.body);
      if (bodyDepth > this.maxDepth) {
        throw new BadRequestException(
          `Request body depth of ${bodyDepth} exceeds the maximum allowed depth of ${this.maxDepth}`,
        );
      }
    }

    if (req.query) {
      const queryDepth = this.getDepth(req.query);
      if (queryDepth > this.maxDepth) {
        throw new BadRequestException(
          `Request query depth of ${queryDepth} exceeds the maximum allowed depth of ${this.maxDepth}`,
        );
      }
    }

    next();
  }

  /**
   * Calculates the depth of an object or array recursively.
   * Handles circular references safely using a WeakSet.
   */
  private getDepth(value: unknown, seen = new WeakSet<object>()): number {
    if (value === null || typeof value !== 'object') {
      return 0;
    }

    if (seen.has(value)) {
      return 0;
    }
    seen.add(value);

    let maxSubDepth = 0;
    const keys = Object.keys(value);
    for (const key of keys) {
      const subValue = (value as Record<string, unknown>)[key];
      maxSubDepth = Math.max(maxSubDepth, this.getDepth(subValue, seen));
    }

    seen.delete(value);
    return 1 + maxSubDepth;
  }
}
