import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  PerformanceMonitorService,
  SLOW_REQUEST_THRESHOLD_MS,
} from '../../modules/monitoring/performance-monitor.service';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseTimeInterceptor.name);

  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (process.env.RESPONSE_TIME_ENABLED === 'false') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // startTime is stamped by the raw Express middleware registered in main.ts
    // (before any NestJS processing, so 401/403 rejections are also measured).
    // Fall back to now() only if the middleware was somehow skipped.
    const startTime: number = req._startTime ?? Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res.statusCode, startTime),
        error: (err: unknown) =>
          this.record(
            req,
            (err as { status?: number })?.status ?? 500,
            startTime,
          ),
      }),
    );
  }

  private record(req: any, statusCode: number, startTime: number): void {
    // Fire-and-forget: do not block the response stream.
    setImmediate(() => {
      const responseTime = Date.now() - startTime;
      // Use the matched route template to avoid cardinality explosion.
      // Raw paths like /api/properties/42 must never reach the metrics store.
      const endpoint: string = req.route?.path ?? req.path;
      const method: string = req.method;
      const slow = responseTime > SLOW_REQUEST_THRESHOLD_MS;

      this.logger.log('http_request', {
        event: 'http_request',
        route: endpoint,
        method,
        status: statusCode,
        duration_ms: responseTime,
        slow,
      });

      if (slow) {
        this.logger.warn('Slow request detected', {
          method,
          endpoint,
          responseTime,
          statusCode,
          userId: (req.user as { id?: string } | undefined)?.id,
          threshold: SLOW_REQUEST_THRESHOLD_MS,
        });
      }

      this.performanceMonitor.recordRequestMetrics({
        timestamp: new Date(startTime),
        endpoint,
        method,
        responseTime,
        statusCode,
        userAgent: req.get?.('User-Agent') as string | undefined,
        userId: (req.user as { id?: string } | undefined)?.id,
        memoryUsage: process.memoryUsage(),
      });
    });
  }
}
