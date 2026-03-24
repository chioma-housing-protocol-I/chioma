import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { ClsService } from '../services/cls.service';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

    const context = {
      requestId,
      correlationId,
      traceId,
      userId: (req as any).user?.id,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
    };

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    this.cls.run(context, () => {
      next();
    });
  }
}
