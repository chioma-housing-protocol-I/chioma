import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';

/**
 * Health indicator for database connection pool availability and utilization.
 * Monitors pool status to detect exhaustion or stalls.
 */
@Injectable()
export class DatabasePoolHealthIndicator extends HealthIndicator {
  constructor(private readonly dataSource: DataSource) {
    super();
  }

  /**
   * Check database pool health by querying available connections.
   * Returns pool metrics: available, waiting, total, and utilization percentage.
   *
   * @param key Health check key name
   * @returns Health indicator result with pool metrics
   * @throws HealthCheckError if pool is exhausted or unhealthy
   */
  async checkHealth(key: string): Promise<HealthIndicatorResult> {
    try {
      // Verify connection is working
      await this.dataSource.query('SELECT 1');

      // Get pool metrics from the underlying postgres driver
      const metrics = this.getPoolMetrics();

      // Determine health status based on utilization
      const isHealthy = this.isPoolHealthy(metrics);

      if (isHealthy) {
        return this.getStatus(key, true, {
          message: 'Database connection pool is healthy',
          ...metrics,
        });
      } else {
        throw new HealthCheckError(
          `Database connection pool utilization is critical`,
          this.getStatus(key, false, {
            message: 'Pool exhausted or near exhaustion',
            ...metrics,
          }),
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof HealthCheckError) {
        throw error;
      }

      throw new HealthCheckError(
        `Database pool check failed: ${errorMessage}`,
        this.getStatus(key, false, {
          message: errorMessage,
          available: 0,
          waiting: 0,
          total: 0,
          utilization: 100,
        }),
      );
    }
  }

  /**
   * Extract pool metrics from the DataSource connection pool.
   */
  private getPoolMetrics(): PoolMetrics {
    const pool = (this.dataSource as any)?.driver?.pool;

    if (!pool) {
      // Pool not available - return conservative estimate
      return {
        available: 0,
        waiting: 0,
        total: 0,
        utilization: 0,
        maxConnections: 0,
        minConnections: 0,
        idleCount: 0,
      };
    }

    const size = pool.totalCount ?? 0;
    const available = pool.availableObjectsCount ?? 0;
    const waiting = pool.waitingClientsCount ?? 0;
    const inUse = size - available;
    const total = size;
    const maxConnections = pool.max ?? 0;
    const minConnections = pool.min ?? 0;
    const utilization =
      maxConnections > 0 ? Math.round((inUse / maxConnections) * 100) : 0;

    return {
      available,
      waiting,
      total,
      inUse,
      utilization,
      maxConnections,
      minConnections,
      idleCount: available,
      percentFull: Math.round((total / maxConnections) * 100),
    };
  }

  /**
   * Determine if pool is healthy based on metrics.
   * Pool is considered unhealthy if:
   * - Utilization >= 95% (near exhaustion)
   * - Waiting connections > 0 (contention)
   * - All connections in use
   */
  private isPoolHealthy(metrics: PoolMetrics): boolean {
    // Pool exhausted or nearly exhausted
    if (metrics.utilization >= 95) {
      return false;
    }

    // Connections waiting (pool contention)
    if (metrics.waiting > 0) {
      return false;
    }

    // All pool connections in use
    if (metrics.available === 0 && metrics.total > 0) {
      return false;
    }

    return true;
  }
}

/**
 * Database pool metrics extracted from connection pool.
 */
export interface PoolMetrics {
  /** Available connections ready for use */
  available: number;
  /** Clients waiting for a connection */
  waiting: number;
  /** Total connections currently in pool */
  total: number;
  /** Connections currently in use */
  inUse?: number;
  /** Utilization percentage (0-100) */
  utilization: number;
  /** Maximum allowed connections */
  maxConnections: number;
  /** Minimum connections to maintain */
  minConnections: number;
  /** Number of idle (available) connections */
  idleCount: number;
  /** Percentage of max capacity in use */
  percentFull?: number;
}
