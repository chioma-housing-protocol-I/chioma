import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimitHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitHeadersMiddleware.name);

  use(req: Request & { rateLimitInfo?: any }, res: Response, next: NextFunction) {
    res.on('finish', () => {
      if (req.rateLimitInfo) {
        res.setHeader('X-RateLimit-Limit', req.rateLimitInfo.limit);
        res.setHeader('X-RateLimit-Remaining', req.rateLimitInfo.remaining);
        res.setHeader('X-RateLimit-Reset', req.rateLimitInfo.reset.toISOString());
        res.setHeader('X-RateLimit-Category', req.rateLimitInfo.category);
      }
    });
    next();
  }
}
