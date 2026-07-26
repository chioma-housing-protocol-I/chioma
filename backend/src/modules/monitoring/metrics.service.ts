import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Histogram,
  Counter,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

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

  private readonly httpRequests = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
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

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
    this.logger.log('MetricsService initialised with prom-client');
  }

  recordHttpRequest(method: string, route: string, status: number): void {
    this.httpRequests.inc({ route, method, status_class: statusClass(status) });
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
  }

  recordBlockchainTransaction(
    type: string,
    status: 'success' | 'failure',
  ): void {
    this.blockchainTx.inc({ type, status });
  }

  recordBlockchainFailure(type: string, error: string): void {
    this.blockchainFailures.inc({ type });
    this.logger.warn(`Blockchain failure: ${type} - ${error}`);
  }

  recordBlockchainDuration(type: string, durationMs: number): void {
    this.blockchainDuration.observe({ type }, durationMs);
  }

  setDatabaseConnections(_count: number): void {}

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

  recordRentPayment(status: 'success' | 'failed'): void {
    this.rentPayments.inc({ status });
  }

  recordNftMint(type: string): void {
    this.nftMints.inc({ type });
  }

  recordDispute(type: string, status: string): void {
    this.disputes.inc({ type, status });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
