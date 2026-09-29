import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../request-context/request-context';

/** Express Request extended with the requestId set by this middleware. */
interface RequestWithId extends Request {
  requestId?: string;
  correlationId?: string;
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    requestContext.run(
      {
        requestId,
        correlationId: requestId,
      },
      () => {
        req.requestId = requestId;
        req.correlationId = requestId;
        res.setHeader('x-request-id', requestId);
        next();
      },
    );
  }
}
