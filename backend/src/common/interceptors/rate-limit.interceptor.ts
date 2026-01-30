import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Interceptor to add rate limit headers to responses
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>() as Request & {
      rateLimit?: {
        limit?: number;
        remaining?: number;
        reset?: number;
      };
    };

    return next.handle().pipe(
      tap(() => {
        // Add rate limit headers if available
        // These will be set by the ThrottlerGuard
        const limit = request.rateLimit?.limit ?? 100;
        const remaining = request.rateLimit?.remaining ?? limit;
        const reset = request.rateLimit?.reset ?? Date.now() + 60000;

        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader('X-RateLimit-Remaining', remaining);
        response.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());
      }),
    );
  }
}
