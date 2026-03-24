import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health') return next();

    const startTime = Date.now();
    const { method, originalUrl: url } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const message = `${method} ${url} ${statusCode} - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(message, undefined, { duration, statusCode });
      } else if (statusCode >= 400) {
        this.logger.warn(message, { duration, statusCode });
      } else {
        this.logger.info(message, { duration, statusCode });
      }
    });

    next();
  }
}

export function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(sanitizeBody);

  const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
  const sanitized = { ...body };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }
  return sanitized;
}
