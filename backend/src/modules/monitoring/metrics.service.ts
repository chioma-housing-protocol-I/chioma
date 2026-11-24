import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import {
  Registry,
  Histogram,
  Counter,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import {
  PerformanceAlertService,
  ThresholdBreach,
} from './performance-alert.service';
import { AlertSeverity } from './entities/performance-alert.entity';
import { registerCacheLookupObserver } from '../../common/cache/cache-metrics';
import {
  emptyGatewayStats,
  normalizeErrorClass,
  normalizeGateway,
  normalizeOperation,
  PaymentGatewayMetricsSnapshot,
  PaymentGatewayOperation,
  PaymentGatewayStats,
} from '../payments/payment-gateway.metrics';

export const PERFORMANCE_THRESHOLDS = {
  httpDurationMs: 2000,
  dbQueryMs: 1000,
  blockchainDurationMs: 30000,
};

/**
 * Bucket boundaries (seconds) for per-endpoint latency. Dense below 1s where
 * most API traffic lands so `histogram_quantile` can resolve p50/p95/p99
 * accurately, with a sparse tail up to 10s to capture slow outliers without
 * bloating series count.
 */
export const ENDPOINT_LATENCY_BUCKETS_SECONDS = [
  0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2,
  3, 5, 10,
];

/** Core Web Vitals reported in milliseconds (CLS is unitless). */
export const WEB_VITAL_TIMING_NAMES = ['LCP', 'FID', 'INP', 'FCP', 'TTFB'];
export const WEB_VITAL_NAMES = [...WEB_VITAL_TIMING_NAMES, 'CLS'];
const WEB_VITAL_RATINGS = ['good', 'needs-improvement', 'poor'];
/** Upper bound on distinct `route` label values for web vitals. */
const MAX_WEB_VITAL_ROUTES = 200;

/**
 * Collapse dynamic path segments (numeric ids, UUIDs, Stellar keys, long
 * slugs/hashes) into `:id` so real-user page routes stay low-cardinality.
 */
export function normalizeWebVitalRoute(route: string | undefined): string {
  if (!route || typeof route !== 'string' || !route.startsWith('/')) {
    return '/';
  }
  const path = route.split(/[?#]/)[0];
  const segments = path
    .split('/')
    .filter(Boolean)
    .slice(0, 6)
    .map((segment) =>
      /^\d+$/.test(segment) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        segment,
      ) ||
      /^[A-Za-z0-9_-]{20,}$/.test(segment)
        ? ':id'
        : segment.slice(0, 40),
    );
  return `/${segments.join('/')}`;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500) return '5xx';
  return 'unknown';
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  readonly registry = new Registry();

  private readonly httpDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request latency in milliseconds',
    labelNames: ['route', 'method', 'status_class'] as const,
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [this.registry],
  });

  /**
   * Per-endpoint latency histogram used for p50/p95/p99 tracking. `endpoint`
   * is always the matched route template (e.g. `/api/properties/:id`), never
   * the raw URL, so cardinality stays bounded by the number of routes.
   */
  private readonly endpointLatency = new Histogram({
    name: 'http_endpoint_latency_seconds',
    help: 'Per-endpoint HTTP request latency in seconds (use histogram_quantile for p50/p95/p99)',
    labelNames: ['endpoint', 'method', 'status_class'] as const,
    buckets: ENDPOINT_LATENCY_BUCKETS_SECONDS,
    registers: [this.registry],
  });

  private readonly httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['route', 'method', 'status_class'] as const,
    registers: [this.registry],
  });

  private readonly httpErrors = new Counter({
    name: 'http_errors_total',
    help: 'Total HTTP requests that completed with a 4xx or 5xx status',
    labelNames: ['route', 'method', 'status_class'] as const,
    registers: [this.registry],
  });

  private readonly blockchainTx = new Counter({
    name: 'blockchain_transactions_total',
    help: 'Total blockchain transactions',
    labelNames: ['type', 'status'] as const,
    registers: [this.registry],
  });

  private readonly blockchainFailures = new Counter({
    name: 'blockchain_failures_total',
    help: 'Total blockchain failures',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  private readonly blockchainDuration = new Histogram({
    name: 'blockchain_operation_duration_ms',
    help: 'Blockchain operation latency in milliseconds',
    labelNames: ['type'] as const,
    buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
    registers: [this.registry],
  });

  private readonly dbQueryDuration = new Histogram({
    name: 'db_query_duration_ms',
    help: 'Database query latency in milliseconds',
    labelNames: ['query_type'] as const,
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
    registers: [this.registry],
  });

  private readonly dbPoolActive = new Gauge({
    name: 'database_pool_active',
    help: 'Active database pool connections',
    registers: [this.registry],
  });

  private readonly dbPoolIdle = new Gauge({
    name: 'database_pool_idle',
    help: 'Idle database pool connections',
    registers: [this.registry],
  });

  private readonly dbPoolMax = new Gauge({
    name: 'database_pool_max',
    help: 'Maximum database pool connections',
    registers: [this.registry],
  });

  private readonly dbPoolWaiting = new Gauge({
    name: 'database_pool_waiting',
    help: 'Waiting database pool connections',
    registers: [this.registry],
  });

  private readonly dbSizeBytes = new Gauge({
    name: 'database_size_bytes',
    help: 'Database size in bytes',
    registers: [this.registry],
  });

  private readonly dbQueryAvgTimeMs = new Gauge({
    name: 'database_query_avg_time_ms',
    help: 'Average database query time in milliseconds',
    registers: [this.registry],
  });

  private readonly dbTps = new Gauge({
    name: 'database_tps',
    help: 'Database transactions per second',
    registers: [this.registry],
  });

  private readonly dbCacheHitRatio = new Gauge({
    name: 'database_cache_hit_ratio',
    help: 'Database cache hit ratio',
    registers: [this.registry],
  });

  private readonly cacheOperations = new Counter({
    name: 'cache_operations_total',
    help: 'Total cache operations by result',
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  private readonly cacheHitRatio = new Gauge({
    name: 'cache_hit_ratio',
    help: 'Cache hit ratio (hits / total operations)',
    registers: [this.registry],
  });

  private cacheHits = 0;
  private cacheTotal = 0;

  private readonly dbReplicationLagSeconds = new Gauge({
    name: 'database_replication_lag_seconds',
    help: 'Replication lag for each database replica in seconds',
    labelNames: ['replica'] as const,
    registers: [this.registry],
  });

  private readonly dbReplicaHealthy = new Gauge({
    name: 'database_replica_healthy',
    help: 'Replica health state where 1 is healthy and 0 is unhealthy',
    labelNames: ['replica'] as const,
    registers: [this.registry],
  });

  private readonly dbReplicaCount = new Gauge({
    name: 'database_replica_count',
    help: 'Number of configured database replicas currently observed',
    registers: [this.registry],
  });

  private readonly queueDepth = new Gauge({
    name: 'queue_depth',
    help: 'Jobs waiting or delayed in the queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly queueOldestJobAgeSeconds = new Gauge({
    name: 'queue_oldest_job_age_seconds',
    help: 'Age in seconds of the oldest waiting job in the queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly queueActiveJobs = new Gauge({
    name: 'queue_active_jobs',
    help: 'Jobs currently being processed in the queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly queueFailedJobs = new Gauge({
    name: 'queue_failed_jobs',
    help: 'Jobs in the failed state for the queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly queuePaused = new Gauge({
    name: 'queue_paused',
    help: 'Whether the queue is paused (1) or running (0)',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly queueStalledState = new Gauge({
    name: 'queue_stalled',
    help: 'Whether the queue is considered stalled (1): jobs are waiting longer than the stall threshold',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  private readonly paymentGatewayOperations = new Counter({
    name: 'payment_gateway_operations_total',
    help: 'Total payment gateway operations by gateway, operation and result',
    labelNames: ['gateway', 'operation', 'status'] as const,
    registers: [this.registry],
  });

  private readonly paymentGatewayRetries = new Histogram({
    name: 'payment_gateway_retry_count',
    help: 'Retry attempts per payment gateway operation',
    labelNames: ['gateway', 'operation'] as const,
    buckets: [0, 1, 2, 3, 5, 10],
    registers: [this.registry],
  });

  private readonly paymentGatewayErrors = new Counter({
    name: 'payment_gateway_errors_total',
    help: 'Payment gateway failures by bounded error class',
    labelNames: ['gateway', 'error_class'] as const,
    registers: [this.registry],
  });

  private readonly paymentGatewayStats = new Map<string, PaymentGatewayStats>();

  private readonly rentPayments = new Counter({
    name: 'rent_payments_total',
    help: 'Total rent payment attempts',
    labelNames: ['status'] as const,
    registers: [this.registry],
  });

  private readonly nftMints = new Counter({
    name: 'nft_mints_total',
    help: 'Total NFT mints',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  private readonly disputes = new Counter({
    name: 'disputes_total',
    help: 'Total disputes',
    labelNames: ['type', 'status'] as const,
    registers: [this.registry],
  });

  private readonly webhookSignatureVerifications = new Counter({
    name: 'webhook_signature_verifications_total',
    help: 'Total webhook signature verification attempts by result',
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  private readonly decryptionFailures = new Counter({
    name: 'decryption_failures_total',
    help: 'Total decryption failures by reason (INVALID_FORMAT, INVALID_KEY, CORRUPTED_DATA, TAMPERING)',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  private readonly blockchainConnectivityUp = new Gauge({
    name: 'blockchain_connectivity_up',
    help: 'Whether the blockchain RPC/Horizon endpoint is reachable (1) or not (0)',
    labelNames: ['network'] as const,
    registers: [this.registry],
  });

  private readonly blockchainConnectivityResponseTime = new Gauge({
    name: 'blockchain_connectivity_response_time_ms',
    help: 'Latency of the last blockchain connectivity check in milliseconds',
    labelNames: ['network'] as const,
    registers: [this.registry],
  });

  private readonly blockchainConnectivityConsecutiveFailures = new Gauge({
    name: 'blockchain_connectivity_consecutive_failures',
    help: 'Number of consecutive failed blockchain connectivity checks',
    labelNames: ['network'] as const,
    registers: [this.registry],
  });

  private readonly blockchainConnectivityLastSuccess = new Gauge({
    name: 'blockchain_connectivity_last_success_timestamp',
    help: 'Unix timestamp (seconds) of the last successful blockchain connectivity check',
    labelNames: ['network'] as const,
    registers: [this.registry],
  });

  /**
   * Real-user Core Web Vitals (LCP, FID, INP, FCP, TTFB) in milliseconds.
   * Buckets bracket Google's good / needs-improvement / poor thresholds
   * (e.g. LCP 2500/4000ms, INP 200/500ms, FID 100/300ms) so p75 can be
   * resolved around the boundaries that matter.
   */
  private readonly webVitalTiming = new Histogram({
    name: 'web_vitals_timing_ms',
    help: 'Real-user Core Web Vitals timing metrics (LCP, FID, INP, FCP, TTFB) in milliseconds',
    labelNames: ['name', 'route'] as const,
    buckets: [
      50, 100, 200, 300, 500, 800, 1000, 1800, 2500, 3000, 4000, 6000, 10000,
    ],
    registers: [this.registry],
  });

  /** Real-user Cumulative Layout Shift (unitless; good <= 0.1, poor > 0.25). */
  private readonly webVitalCls = new Histogram({
    name: 'web_vitals_cls',
    help: 'Real-user Cumulative Layout Shift score',
    labelNames: ['route'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  private readonly webVitalReports = new Counter({
    name: 'web_vitals_reports_total',
    help: 'Real-user Core Web Vitals reports by metric and rating',
    labelNames: ['name', 'rating'] as const,
    registers: [this.registry],
  });

  private readonly webVitalRoutes = new Set<string>();

  constructor(
    @Optional() private readonly alertService?: PerformanceAlertService,
  ) {}

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
    // Feed application cache lookups (CacheService) into the cache hit-rate
    // metrics. Uses a process-wide observer so every CacheService instance is
    // counted without a DI dependency on the monitoring module.
    registerCacheLookupObserver((hit) => this.recordCacheOperation(hit));
    this.logger.log('MetricsService initialised with prom-client');
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, status: number): void {
    const labels = { route, method, status_class: statusClass(status) };
    this.httpRequests.inc(labels);
    if (status >= 400) {
      this.httpErrors.inc(labels);
    }
    if (status >= 500) {
      this.raiseAlert({
        metric: `http_5xx_${method}_${route}`,
        severity: AlertSeverity.CRITICAL,
        message: `${method} ${route} returned ${status}`,
        value: status,
      });
    }
  }

  recordHttpDuration(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ): void {
    this.httpDuration.observe(
      { route, method, status_class: statusClass(status) },
      durationMs,
    );
    this.checkThreshold(
      `http_duration_${method}_${route}`,
      durationMs,
      PERFORMANCE_THRESHOLDS.httpDurationMs,
      `Slow HTTP request ${method} ${route}`,
    );
  }

  /**
   * Record one request's latency against the per-endpoint histogram.
   * `endpoint` must be a route template, not a concrete path.
   */
  recordEndpointLatency(
    method: string,
    endpoint: string,
    status: number,
    durationMs: number,
  ): void {
    this.endpointLatency.observe(
      { endpoint, method, status_class: statusClass(status) },
      durationMs / 1000,
    );
  }

  /**
   * Record one real-user Core Web Vital reported by the frontend. Unknown
   * metric names are ignored and routes are normalised + capped so client
   * input cannot create unbounded Prometheus series.
   */
  recordWebVital(
    name: string,
    value: number,
    rating?: string,
    route?: string,
  ): void {
    if (!WEB_VITAL_NAMES.includes(name)) return;
    if (!Number.isFinite(value) || value < 0) return;

    let routeLabel = normalizeWebVitalRoute(route);
    if (!this.webVitalRoutes.has(routeLabel)) {
      if (this.webVitalRoutes.size >= MAX_WEB_VITAL_ROUTES) {
        routeLabel = 'other';
      } else {
        this.webVitalRoutes.add(routeLabel);
      }
    }

    if (name === 'CLS') {
      this.webVitalCls.observe({ route: routeLabel }, value);
    } else {
      this.webVitalTiming.observe({ name, route: routeLabel }, value);
    }

    this.webVitalReports.inc({
      name,
      rating:
        rating && WEB_VITAL_RATINGS.includes(rating) ? rating : 'unknown',
    });
  }

  // Blockchain Metrics Methods
  recordBlockchainTransaction(
    type: string,
    status: 'success' | 'failure',
  ): void {
    this.blockchainTx.inc({ type, status });
  }

  recordBlockchainFailure(type: string, error: string): void {
    this.blockchainFailures.inc({ type });
    this.logger.warn(`Blockchain failure: ${type} - ${error}`);
    this.raiseAlert({
      metric: `blockchain_failure_${type}`,
      severity: AlertSeverity.CRITICAL,
      message: `Blockchain failure: ${type} - ${error}`,
    });
  }

  recordBlockchainDuration(type: string, durationMs: number): void {
    this.blockchainDuration.observe({ type }, durationMs);
    this.checkThreshold(
      `blockchain_duration_${type}`,
      durationMs,
      PERFORMANCE_THRESHOLDS.blockchainDurationMs,
      `Slow blockchain transaction ${type}`,
    );
  }

  // Database Metrics Methods
  setDatabasePoolUsage(
    active: number,
    idle: number,
    max: number,
    waiting: number,
  ): void {
    this.dbPoolActive.set(active);
    this.dbPoolIdle.set(idle);
    this.dbPoolMax.set(max);
    this.dbPoolWaiting.set(waiting);
  }

  setDatabaseSize(bytes: number): void {
    this.dbSizeBytes.set(bytes);
  }

  setQueryMetrics(avgTimeMs: number, tps: number, cacheHitRatio: number): void {
    this.dbQueryAvgTimeMs.set(avgTimeMs);
    this.dbTps.set(tps);
    this.dbCacheHitRatio.set(cacheHitRatio);
  }

  setReplicationLag(replica: string, lagSeconds: number): void {
    this.dbReplicationLagSeconds.set({ replica }, lagSeconds);
  }

  setReplicaHealth(replica: string, healthy: boolean): void {
    this.dbReplicaHealthy.set({ replica }, healthy ? 1 : 0);
  }

  setReplicaCount(count: number): void {
    this.dbReplicaCount.set(count);
  }

  recordDatabaseQuery(queryType: string, durationMs: number): void {
    this.dbQueryDuration.observe({ query_type: queryType }, durationMs);
    this.checkThreshold(
      `db_query_${queryType}`,
      durationMs,
      PERFORMANCE_THRESHOLDS.dbQueryMs,
      `Slow database query ${queryType}`,
    );
  }

  recordCacheOperation(hit: boolean): void {
    const result = hit ? 'hit' : 'miss';
    this.cacheOperations.inc({ result });
    this.cacheTotal++;
    if (hit) this.cacheHits++;
    this.cacheHitRatio.set(
      this.cacheTotal > 0 ? this.cacheHits / this.cacheTotal : 0,
    );
  }

  /**
   * Export per-queue gauges so a stalled or backed-up background processor
   * is visible on the Prometheus metrics endpoint before user-facing
   * symptoms appear.
   */
  setQueueMetrics(
    queue: string,
    metrics: {
      depth: number;
      oldestJobAgeSeconds: number;
      active: number;
      failed: number;
      paused: boolean;
      stalled: boolean;
    },
  ): void {
    this.queueDepth.set({ queue }, metrics.depth);
    this.queueOldestJobAgeSeconds.set({ queue }, metrics.oldestJobAgeSeconds);
    this.queueActiveJobs.set({ queue }, metrics.active);
    this.queueFailedJobs.set({ queue }, metrics.failed);
    this.queuePaused.set({ queue }, metrics.paused ? 1 : 0);
    this.queueStalledState.set({ queue }, metrics.stalled ? 1 : 0);
  }

  /**
   * Records one gateway outcome. Label values are normalised to bounded
   * vocabularies so an operator-supplied gateway name cannot create an
   * unbounded Prometheus series.
   */
  recordPaymentGatewayOperation(event: PaymentGatewayOperation): void {
    const gateway = normalizeGateway(event.gateway);
    const operation = normalizeOperation(event.operation);
    const status = event.success ? 'success' : 'failure';
    const retries = Math.max(0, Math.floor(event.retries ?? 0));

    this.paymentGatewayOperations.inc({ gateway, operation, status });
    this.paymentGatewayRetries.observe({ gateway, operation }, retries);

    let stats = this.paymentGatewayStats.get(gateway);
    if (!stats) {
      stats = emptyGatewayStats();
      this.paymentGatewayStats.set(gateway, stats);
    }
    stats.total += 1;
    stats.retries += retries;
    if (event.success) {
      stats.successes += 1;
    } else {
      stats.failures += 1;
      const errorClass = normalizeErrorClass(event.errorClass);
      this.paymentGatewayErrors.inc({ gateway, error_class: errorClass });
      stats.errors[errorClass] = (stats.errors[errorClass] ?? 0) + 1;
    }
    stats.operations[operation] = (stats.operations[operation] ?? 0) + 1;
    stats.successRate = stats.total > 0 ? stats.successes / stats.total : 0;
    stats.errorRate = stats.total > 0 ? stats.failures / stats.total : 0;
  }

  /** Snapshot of success rate, retry totals and error rate per gateway. */
  getPaymentGatewayMetrics(): PaymentGatewayMetricsSnapshot {
    const snapshot: PaymentGatewayMetricsSnapshot = {};
    for (const [gateway, stats] of this.paymentGatewayStats) {
      snapshot[gateway] = {
        ...stats,
        operations: { ...stats.operations },
        errors: { ...stats.errors },
      };
    }
    return snapshot;
  }

  recordRentPayment(status: 'success' | 'failed'): void {
    this.rentPayments.inc({ status });
    if (status === 'failed') {
      this.raiseAlert({
        metric: 'rent_payment_failed',
        severity: AlertSeverity.WARNING,
        message: 'Rent payment failed',
      });
    }
  }

  recordNftMint(type: string): void {
    this.nftMints.inc({ type });
  }

  recordDispute(type: string, status: string): void {
    this.disputes.inc({ type, status });
  }

  /**
   * Record the outcome of a webhook signature verification. `result` is
   * `success` for accepted requests or one of the machine-readable rejection
   * reasons (e.g. `signature_mismatch`, `timestamp_expired`) so tampering and
   * replay attempts can be alerted on.
   */
  recordWebhookSignatureVerification(result: string): void {
    this.webhookSignatureVerifications.inc({ result });
  }

  /**
   * Record a decryption failure by reason so ops can distinguish between a
   * misconfigured key (INVALID_KEY), data corruption (CORRUPTED_DATA), and
   * active tampering (TAMPERING) in dashboards and alerts.
   */
  recordDecryptionFailure(reason: string): void {
    this.decryptionFailures.inc({ reason });
  }

  recordBlockchainConnectivityCheck(
    network: string,
    healthy: boolean,
    responseTimeMs: number,
    consecutiveFailures: number,
  ): void {
    this.blockchainConnectivityUp.set({ network }, healthy ? 1 : 0);
    this.blockchainConnectivityResponseTime.set({ network }, responseTimeMs);
    this.blockchainConnectivityConsecutiveFailures.set(
      { network },
      consecutiveFailures,
    );
    if (healthy) {
      this.blockchainConnectivityLastSuccess.set(
        { network },
        Math.floor(Date.now() / 1000),
      );
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  private checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    label: string,
  ): void {
    if (value <= threshold) return;
    this.raiseAlert({
      metric,
      severity:
        value > threshold * 2 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      message: `${label}: ${value}ms exceeds ${threshold}ms`,
      value,
      threshold,
    });
  }

  private raiseAlert(breach: ThresholdBreach): void {
    if (!this.alertService) return;
    this.alertService
      .recordBreach(breach)
      .catch((err) =>
        this.logger.error(`Failed to persist alert: ${err?.message ?? err}`),
      );
  }
}
