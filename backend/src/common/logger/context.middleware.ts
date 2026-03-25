import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContext } from './request-context';

/**
 * Middleware that initializes the RequestContext (AsyncLocalStorage)
 * from incoming request headers and attaches unique IDs.
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();

    // Attach to response headers for observability
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    // Run the rest of the request within the context
    RequestContext.run(
      {
        requestId,
        correlationId,
        traceId,
        userId: (req as any).user?.id,
      },
      () => next(),
    );
  }
}
