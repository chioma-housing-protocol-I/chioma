import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Fallback for routes that aren't covered by the global ThrottlerGuard or
 * the per-route RateLimitGuard (e.g. a route marked @SkipThrottle()).
 *
 * Both of those guards set X-RateLimit-* headers themselves during the
 * guard phase, before this interceptor's tap() runs on the way out. This
 * must not clobber those real values with placeholders here — `request.
 * rateLimit` is never populated by anything in this codebase, so the old
 * unconditional setHeader() calls were overwriting accurate headers with a
 * hardcoded 100/100 on every single request.
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        if (response.getHeader('X-RateLimit-Limit') !== undefined) {
          return;
        }

        const limit = 100;
        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader('X-RateLimit-Remaining', limit);
        response.setHeader(
          'X-RateLimit-Reset',
          new Date(Date.now() + 60000).toISOString(),
        );
      }),
    );
  }
}
