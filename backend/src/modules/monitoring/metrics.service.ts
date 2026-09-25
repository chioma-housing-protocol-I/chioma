import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  PerformanceAlertService,
  ThresholdBreach,
} from './performance-alert.service';
import { AlertSeverity } from './entities/performance-alert.entity';

export const PERFORMANCE_THRESHOLDS = {
  httpDurationMs: 2000,
  dbQueryMs: 1000,
  blockchainDurationMs: 30000,
};

// Simplified metrics service without prom-client dependency
// Install prom-client to enable full functionality: pnpm add prom-client

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, any> = new Map();

  constructor(
    @Optional() private readonly alertService?: PerformanceAlertService,
  ) {
    this.logger.log('MetricsService initialized (simplified mode)');
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, status: number) {
    const key = `http_requests_${method}_${route}_${status}`;
    this.incrementMetric(key);
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
    duration: number,
  ) {
    const key = `http_duration_${method}_${route}`;
    this.recordHistogram(key, duration);
    this.checkThreshold(
      key,
      duration,
      PERFORMANCE_THRESHOLDS.httpDurationMs,
      `Slow HTTP request ${method} ${route}`,
    );
  }

  // Blockchain Metrics Methods
  recordBlockchainTransaction(type: string, status: 'success' | 'failure') {
    const key = `blockchain_tx_${type}_${status}`;
    this.incrementMetric(key);
  }

  recordBlockchainFailure(type: string, error: string) {
    const key = `blockchain_failure_${type}`;
    this.incrementMetric(key);
    this.logger.warn(`Blockchain failure: ${type} - ${error}`);
    this.raiseAlert({
      metric: key,
      severity: AlertSeverity.CRITICAL,
      message: `Blockchain failure: ${type} - ${error}`,
    });
  }

  recordBlockchainDuration(type: string, duration: number) {
    const key = `blockchain_duration_${type}`;
    this.recordHistogram(key, duration);
    this.checkThreshold(
      key,
      duration,
      PERFORMANCE_THRESHOLDS.blockchainDurationMs,
      `Slow blockchain transaction ${type}`,
    );
  }

  // Database Metrics Methods
  setDatabaseConnections(count: number) {
    this.metrics.set('database_connections', count);
  }

  recordDatabaseQuery(queryType: string, duration: number) {
    const key = `db_query_${queryType}`;
    this.recordHistogram(key, duration);
    this.checkThreshold(
      key,
      duration,
      PERFORMANCE_THRESHOLDS.dbQueryMs,
      `Slow database query ${queryType}`,
    );
  }

  // Business Metrics Methods
  recordRentPayment(status: 'success' | 'failed') {
    const key = `rent_payment_${status}`;
    this.incrementMetric(key);
    if (status === 'failed') {
      this.raiseAlert({
        metric: key,
        severity: AlertSeverity.WARNING,
        message: 'Rent payment failed',
      });
    }
  }

  recordNftMint(type: string) {
    const key = `nft_mint_${type}`;
    this.incrementMetric(key);
  }

  recordDispute(type: string, status: string) {
    const key = `dispute_${type}_${status}`;
    this.incrementMetric(key);
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    let output = '# Chioma Backend Metrics\n';

    for (const [key, value] of this.metrics.entries()) {
      if (typeof value === 'number') {
        output += `${key} ${value}\n`;
      } else if (Array.isArray(value)) {
        const avg = value.reduce((a, b) => a + b, 0) / value.length;
        output += `${key}_avg ${avg.toFixed(3)}\n`;
        output += `${key}_count ${value.length}\n`;
      }
    }

    return output;
  }

  private checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    label: string,
  ) {
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

  private raiseAlert(breach: ThresholdBreach) {
    if (!this.alertService) return;
    this.alertService
      .recordBreach(breach)
      .catch((err) =>
        this.logger.error(`Failed to persist alert: ${err?.message ?? err}`),
      );
  }

  private incrementMetric(key: string) {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  private recordHistogram(key: string, value: number) {
    const current = this.metrics.get(key) || [];
    current.push(value);
    // Keep only last 100 values
    if (current.length > 100) {
      current.shift();
    }
    this.metrics.set(key, current);
  }

  getRegistry(): any {
    return null; // Placeholder for prom-client registry
  }
}
