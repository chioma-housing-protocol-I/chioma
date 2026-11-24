import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from '../modules/monitoring/metrics.service';

type MetricsRequest = {
  method: string;
  route?: { path?: string };
  _startTime?: number;
};

type MetricsResponse = {
  statusCode: number;
  once(event: 'finish', listener: () => void): unknown;
};

/**
 * Records per-endpoint request latency into the
 * `http_endpoint_latency_seconds` Prometheus histogram so p50/p95/p99 can be
 * derived per route with `histogram_quantile`.
 *
 * Latency is measured until the response has been fully written (`finish`),
 * so the final status code set by exception filters is used and
 * serialisation time is included. The start time is the `_startTime` stamped
 * by the raw Express middleware in main.ts (falls back to interception time).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<MetricsRequest>();
    const res = http.getResponse<MetricsResponse>();
    const startTime = req._startTime ?? Date.now();

    // Route template (e.g. `/api/v1/properties/:id`), never the raw URL, so
    // label cardinality is bounded by the number of declared routes.
    const endpoint = req.route?.path ?? 'unmatched';

    res.once('finish', () => {
      this.metricsService.recordEndpointLatency(
        req.method,
        endpoint,
        res.statusCode,
        Date.now() - startTime,
      );
    });

    return next.handle();
  }
}
