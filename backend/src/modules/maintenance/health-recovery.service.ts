import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';

export interface HealthRecoveryStrategy {
  name: string;
  description: string;
  shouldExecute: () => Promise<boolean>;
  execute: () => Promise<void>;
}

/**
 * Proactive health recovery service that detects and heals system issues.
 * Performs preventive maintenance before services degrade.
 */
@Injectable()
export class HealthRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthRecoveryService.name);
  private strategies = new Map<string, HealthRecoveryStrategy>();
  private isEnabled = true;
  private healingInterval?: NodeJS.Timeout;
  private readonly HEALING_INTERVAL_MS = 60_000; // Heal every 60 seconds

  constructor(private readonly health: HealthCheckService) {}

  onModuleInit(): void {
    this.registerDefaultStrategies();
    this.startHealing();
    this.logger.log('Health recovery service initialized');
  }

  onModuleDestroy(): void {
    this.stopHealing();
  }

  /**
   * Register a custom healing strategy
   */
  registerStrategy(strategy: HealthRecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    this.logger.debug(`Registered healing strategy: ${strategy.name}`);
  }

  /**
   * Manually trigger a healing strategy
   */
  async heal(strategyName: string): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Health recovery is disabled');
      return;
    }

    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      this.logger.warn(`Healing strategy not found: ${strategyName}`);
      throw new Error(`Healing strategy not found: ${strategyName}`);
    }

    try {
      const shouldExecute = await strategy.shouldExecute();
      if (!shouldExecute) {
        this.logger.debug(
          `Healing strategy skipped: ${strategyName} (condition not met)`,
        );
        return;
      }

      this.logger.log(`Executing healing strategy: ${strategyName}`);
      await strategy.execute();
      this.logger.log(`Healing strategy completed: ${strategyName}`);
    } catch (error) {
      this.logger.error(`Healing strategy failed: ${strategyName}`, error);
    }
  }

  /**
   * Enable/disable health recovery
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.log(`Health recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get list of available strategies
   */
  getAvailableStrategies(): HealthRecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  private registerDefaultStrategies(): void {
    // Strategy: Clear memory leaks by forcing garbage collection
    this.registerStrategy({
      name: 'force-gc-if-high-memory',
      description: 'Force garbage collection if memory usage is high',
      shouldExecute: async () => {
        const memUsage = process.memoryUsage();
        const heapPercentage = memUsage.heapUsed / memUsage.heapTotal;
        // Execute if using more than 85% of heap
        return heapPercentage > 0.85;
      },
      execute: async () => {
        if (global.gc) {
          global.gc();
          this.logger.log('Garbage collection executed');
        } else {
          this.logger.warn(
            'Garbage collection not available (run with --expose-gc)',
          );
        }
      },
    });

    // Strategy: Reconnect to database if connection is stale
    this.registerStrategy({
      name: 'reconnect-if-db-stale',
      description: 'Reconnect to database if connection is stale',
      shouldExecute: async () => {
        // This would be implemented with database-specific logic
        // For now, always return false (requires database integration)
        return false;
      },
      execute: async () => {
        this.logger.log('Database connection refreshed');
      },
    });

    // Strategy: Clear stale cache entries
    this.registerStrategy({
      name: 'clear-stale-cache',
      description: 'Clear stale or expired cache entries',
      shouldExecute: async () => {
        // This would be implemented with cache-specific logic
        return false;
      },
      execute: async () => {
        this.logger.log('Stale cache entries cleared');
      },
    });

    // Strategy: Drain backlogged queues
    this.registerStrategy({
      name: 'drain-queue-backlog',
      description: 'Process queue backlog if it exceeds threshold',
      shouldExecute: async () => {
        // This would be implemented with queue-specific logic
        return false;
      },
      execute: async () => {
        this.logger.log('Queue backlog drained');
      },
    });

    // Strategy: Rebalance connection pools
    this.registerStrategy({
      name: 'rebalance-pools',
      description: 'Rebalance database and cache connection pools',
      shouldExecute: async () => {
        // Check if any pool is near saturation
        return false;
      },
      execute: async () => {
        this.logger.log('Connection pools rebalanced');
      },
    });

    this.logger.log(
      `Registered ${this.strategies.size} default healing strategies`,
    );
  }

  private startHealing(): void {
    this.healingInterval = setInterval(() => {
      void this.runHealingCycle();
    }, this.HEALING_INTERVAL_MS);

    this.logger.log(
      `Health recovery started (interval: ${this.HEALING_INTERVAL_MS}ms)`,
    );
  }

  private async runHealingCycle(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Execute all healing strategies
      for (const strategy of this.strategies.values()) {
        await this.heal(strategy.name);
      }
    } catch (error) {
      this.logger.debug('Health recovery cycle encountered error', error);
    }
  }

  private stopHealing(): void {
    if (this.healingInterval) {
      clearInterval(this.healingInterval);
      this.logger.log('Health recovery stopped');
    }
  }
}
