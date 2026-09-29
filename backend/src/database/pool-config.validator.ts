import { Logger } from '@nestjs/common';

/**
 * Database connection pool configuration validator.
 * Validates and warns about pool size settings to prevent connection exhaustion.
 */
export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface PoolValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PoolWorkloadRecommendation {
  name: string;
  description: string;
  minConnections: number;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const WORKLOAD_RECOMMENDATIONS: Record<string, PoolWorkloadRecommendation> = {
  development: {
    name: 'Development',
    description: 'Local development with low concurrency',
    minConnections: 2,
    maxConnections: 5,
    idleTimeoutMs: 60000,
    connectionTimeoutMs: 5000,
  },
  testing: {
    name: 'Testing',
    description: 'Test environment with moderate isolation',
    minConnections: 3,
    maxConnections: 10,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 3000,
  },
  staging: {
    name: 'Staging',
    description: 'Staging environment mirroring production',
    minConnections: 10,
    maxConnections: 30,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 2000,
  },
  production: {
    name: 'Production',
    description: 'High availability production environment',
    minConnections: 20,
    maxConnections: 50,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 2000,
  },
  'high-throughput': {
    name: 'High Throughput',
    description: 'Heavy transaction volume with many concurrent users',
    minConnections: 30,
    maxConnections: 100,
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 2000,
  },
  'low-throughput': {
    name: 'Low Throughput',
    description: 'Light workload with few concurrent connections',
    minConnections: 5,
    maxConnections: 15,
    idleTimeoutMs: 45000,
    connectionTimeoutMs: 3000,
  },
};

export class PoolConfigValidator {
  private readonly logger = new Logger(PoolConfigValidator.name);

  /**
   * Validate pool configuration and return validation result with warnings.
   * Does not throw - returns errors and warnings for caller to decide action.
   *
   * @param config Pool configuration to validate
   * @returns Validation result with errors and warnings
   */
  validate(config: PoolConfig): PoolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation rules
    if (config.min < 1) {
      errors.push(
        `Pool min connections must be >= 1 (got ${config.min}). Minimum viable value is 1.`,
      );
    }

    if (config.max < 1) {
      errors.push(
        `Pool max connections must be >= 1 (got ${config.max}). Minimum viable value is 1.`,
      );
    }

    if (config.min > config.max) {
      errors.push(
        `Pool min (${config.min}) cannot be greater than max (${config.max})`,
      );
    }

    if (config.max > 200) {
      warnings.push(
        `Pool max connections is very high (${config.max}). This may indicate misconfiguration. Recommended max is typically <= 100. Verify your workload requires this many connections.`,
      );
    }

    if (config.max > 500) {
      errors.push(
        `Pool max connections exceeds safe limit (${config.max} > 500). This could exhaust system resources. Reduce to <= 100 or verify infrastructure capacity.`,
      );
    }

    if (config.min === config.max) {
      warnings.push(
        `Pool min equals max (both ${config.min}). No flexibility for connection pooling. Consider min = max/2 to 2/3.`,
      );
    }

    if (config.max - config.min < 2 && config.max > 5) {
      warnings.push(
        `Pool min-max range is very narrow (min=${config.min}, max=${config.max}). Limited ability to handle traffic spikes. Increase range for better resilience.`,
      );
    }

    if (config.idleTimeoutMillis < 5000) {
      warnings.push(
        `Idle timeout is very short (${config.idleTimeoutMillis}ms). Connections will close rapidly, causing frequent reconnects. Consider >= 30000ms.`,
      );
    }

    if (config.idleTimeoutMillis > 300000) {
      warnings.push(
        `Idle timeout is very long (${config.idleTimeoutMillis}ms). Old connections may accumulate. Consider <= 60000ms.`,
      );
    }

    if (config.connectionTimeoutMillis < 500) {
      warnings.push(
        `Connection timeout is very short (${config.connectionTimeoutMillis}ms). May cause premature timeouts on slow network. Consider >= 2000ms.`,
      );
    }

    if (config.connectionTimeoutMillis > 30000) {
      warnings.push(
        `Connection timeout is very long (${config.connectionTimeoutMillis}ms). Failed connections will block long. Consider <= 5000ms.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended pool configuration for a specific workload.
   *
   * @param workload Workload type (development, production, high-throughput, etc.)
   * @returns Recommended pool configuration
   */
  getWorkloadRecommendation(
    workload: string,
  ): PoolWorkloadRecommendation | null {
    return WORKLOAD_RECOMMENDATIONS[workload] || null;
  }

  /**
   * List all available workload recommendations.
   */
  listWorkloadRecommendations(): PoolWorkloadRecommendation[] {
    return Object.values(WORKLOAD_RECOMMENDATIONS);
  }

  /**
   * Validate and log results. Throws on errors if strict mode, warns only if not strict.
   *
   * @param config Pool configuration to validate
   * @param strict If true, throw on errors; if false, only log warnings
   */
  validateAndLog(config: PoolConfig, strict: boolean = false): void {
    const result = this.validate(config);

    if (result.errors.length > 0) {
      result.errors.forEach((error) => {
        this.logger.error(`[Pool Config Error] ${error}`);
      });

      if (strict) {
        throw new Error(
          `Database pool configuration is invalid:\n${result.errors.join('\n')}`,
        );
      }
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((warning) => {
        this.logger.warn(`[Pool Config Warning] ${warning}`);
      });
    }

    if (result.isValid && result.warnings.length === 0) {
      this.logger.log(
        `[Pool Config] Validated: min=${config.min}, max=${config.max}, idle=${config.idleTimeoutMillis}ms, connect=${config.connectionTimeoutMillis}ms`,
      );
    }
  }
}
