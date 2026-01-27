import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { sanitizeBody } from '../middleware/logger.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const body = sanitizeBody(req.body as Record<string, unknown>);

    // Store on res.locals (safe across lifecycle)
    res.locals['requestBody'] = body;

    return next.handle();
  }
}
