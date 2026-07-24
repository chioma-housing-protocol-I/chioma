import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, timeout } from 'rxjs';

/**
 * Global timeout interceptor for all HTTP requests.
 * Prevents requests from hanging indefinitely.
 *
 * Timeout values:
 * - General requests: 30s
 * - File upload: 60s
 * - Webhook: 60s
 * - Blockchain: 45s
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly timeouts = {
    default: 30_000,
    upload: 60_000,
    webhook: 60_000,
    blockchain: 45_000,
    health: 10_000,
    admin: 30_000,
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const timeoutMs = this.getTimeout(request.path);

    return next.handle().pipe(
      timeout(timeoutMs),
      // Error handling is done by the global exception filter
    );
  }

  private getTimeout(path: string): number {
    // Health checks should timeout quickly
    if (path.startsWith('/health')) {
      return this.timeouts.health;
    }

    // File uploads need more time
    if (path.includes('/upload') || path.includes('/file')) {
      return this.timeouts.upload;
    }

    // Webhooks
    if (path.includes('/webhook')) {
      return this.timeouts.webhook;
    }

    // Blockchain operations
    if (path.includes('/blockchain') || path.includes('/anchor')) {
      return this.timeouts.blockchain;
    }

    // Admin operations
    if (path.includes('/admin')) {
      return this.timeouts.admin;
    }

    return this.timeouts.default;
  }
}
