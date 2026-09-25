import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { IncidentService } from '../../common/resilience/incident.service';
import { DegradationService } from '../../common/resilience/degradation.service';
import { CascadeDetectorService } from '../../common/resilience/cascade-detector.service';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import {
  IncidentSeverity,
  DegradationLevel,
} from '../../common/resilience/resilience.types';

export interface AutoRecoveryAction {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<void>;
}

/**
 * Automatic recovery service that implements self-healing workflows.
 * Automatically remediates common failure scenarios without human intervention.
 */
@Injectable()
export class AutoRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoRecoveryService.name);
  private recoveryActions = new Map<string, AutoRecoveryAction>();
  private isEnabled = true;
  private scanInterval?: NodeJS.Timeout;
  private readonly SCAN_INTERVAL_MS = 30_000; // Scan every 30 seconds

  constructor(
    private readonly incident: IncidentService,
    private readonly degradation: DegradationService,
    private readonly cascadeDetector: CascadeDetectorService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  onModuleInit(): void {
    this.registerDefaultActions();
    this.startMonitoring();
    this.logger.log('Auto-recovery service initialized');
  }

  onModuleDestroy(): void {
    this.stopMonitoring();
  }

  /**
   * Register a custom recovery action
   */
  registerAction(action: AutoRecoveryAction): void {
    this.recoveryActions.set(action.name, action);
    this.logger.debug(`Registered recovery action: ${action.name}`);
  }

  /**
   * Manually trigger recovery for a specific action
   */
  async recover(actionName: string): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Auto-recovery is disabled');
      return;
    }

    const action = this.recoveryActions.get(actionName);
    if (!action) {
      this.logger.warn(`Recovery action not found: ${actionName}`);
      throw new Error(`Recovery action not found: ${actionName}`);
    }

    try {
      this.logger.log(`Executing recovery action: ${actionName}`);
      await action.execute();
      this.logger.log(`Recovery action completed: ${actionName}`);
    } catch (error) {
      this.logger.error(`Recovery action failed: ${actionName}`, error);
      throw error;
    }
  }

  /**
   * Enable/disable automatic recovery
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.log(`Auto-recovery ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get list of available recovery actions
   */
  getAvailableActions(): AutoRecoveryAction[] {
    return Array.from(this.recoveryActions.values());
  }

  private registerDefaultActions(): void {
    // Action: Reset circuit breaker if it's been open too long
    this.registerAction({
      name: 'reset-stale-circuit-breakers',
      description: 'Reset circuit breakers that have been open for too long',
      severity: 'medium',
      execute: async () => {
        const metrics = this.circuitBreaker.getMetrics();
        const now = Date.now();

        Object.entries(metrics).forEach(([name, metric]) => {
          if (
            metric.state === 'OPEN' &&
            metric.lastFailureTime &&
            now - metric.lastFailureTime > 300_000 // 5 minutes
          ) {
            this.logger.log(`Resetting stale circuit breaker: ${name}`);
            this.circuitBreaker.reset(name);
          }
        });
      },
    });

    // Action: Clear cascading failures if primary service is recovered
    this.registerAction({
      name: 'resolve-cascades',
      description: 'Resolve cascading failures when primary service recovers',
      severity: 'high',
      execute: async () => {
        const cascadeStatus = this.cascadeDetector.getCascadeStatus();

        if (cascadeStatus.isInCascade) {
          this.logger.log(
            `Detected cascade with ${cascadeStatus.failedServices.length} failed services`,
          );
          // Record cascade incident
          this.incident.declare({
            title: 'Cascading Failure Detected',
            description: `Services affected: ${cascadeStatus.failedServices.join(', ')}`,
            severity: IncidentSeverity.SEV2,
            affectedServices: cascadeStatus.failedServices,
          });
        }
      },
    });

    // Action: Auto-degrade gracefully if multiple critical services are down
    this.registerAction({
      name: 'escalate-degradation',
      description: 'Escalate degradation level based on cascade severity',
      severity: 'high',
      execute: async () => {
        const cascadeStatus = this.cascadeDetector.getCascadeStatus();
        const currentLevel = this.degradation.getLevel();

        if (cascadeStatus.failedServices.length >= 3) {
          if (
            currentLevel !== DegradationLevel.PARTIAL &&
            currentLevel !== DegradationLevel.SEVERE
          ) {
            this.degradation.setLevel(
              DegradationLevel.PARTIAL,
              'Escalating due to multiple service failures',
            );
            this.logger.warn('System degraded to PARTIAL mode');
          } else if (currentLevel === DegradationLevel.PARTIAL) {
            this.degradation.setLevel(
              DegradationLevel.SEVERE,
              'Escalating to SEVERE due to cascade',
            );
            this.logger.error('System degraded to SEVERE mode');
          }
        }
      },
    });

    // Action: Release degradation if services recover
    this.registerAction({
      name: 'deescalate-degradation',
      description: 'Reduce degradation level when services recover',
      severity: 'medium',
      execute: async () => {
        const cascadeStatus = this.cascadeDetector.getCascadeStatus();
        const currentLevel = this.degradation.getLevel();

        if (
          !cascadeStatus.isInCascade &&
          currentLevel !== DegradationLevel.NORMAL
        ) {
          this.degradation.setLevel(
            DegradationLevel.NORMAL,
            'Removing degradation - all services recovered',
          );
          this.logger.log('System returned to NORMAL mode');
        }
      },
    });

    // Action: Monitor and alert on repetitive failures
    this.registerAction({
      name: 'detect-repetitive-failures',
      description: 'Detect and alert on services that fail repeatedly',
      severity: 'medium',
      execute: async () => {
        const metrics = this.circuitBreaker.getMetrics();

        Object.entries(metrics).forEach(([name, metric]) => {
          const failureRate =
            metric.failures / (metric.failures + metric.successes || 1);

          if (failureRate > 0.8 && metric.failures > 10) {
            this.logger.warn(
              `High failure rate detected on ${name}: ${(failureRate * 100).toFixed(1)}%`,
            );

            this.incident.declare({
              title: `Repetitive Failures on ${name}`,
              description: `${name} has failure rate of ${(failureRate * 100).toFixed(1)}%`,
              severity: IncidentSeverity.SEV3,
              affectedServices: [name],
            });
          }
        });
      },
    });

    this.logger.log(
      `Registered ${this.recoveryActions.size} default recovery actions`,
    );
  }

  private startMonitoring(): void {
    this.scanInterval = setInterval(() => {
      void this.runRecoveryScan();
    }, this.SCAN_INTERVAL_MS);

    this.logger.log(
      `Auto-recovery scanning started (interval: ${this.SCAN_INTERVAL_MS}ms)`,
    );
  }

  private async runRecoveryScan(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Periodically attempt recovery actions
      await this.recover('reset-stale-circuit-breakers');
      await this.recover('resolve-cascades');
      await this.recover('escalate-degradation');
      await this.recover('deescalate-degradation');
      await this.recover('detect-repetitive-failures');
    } catch (error) {
      this.logger.debug(
        'Auto-recovery scan encountered non-critical error',
        error,
      );
    }
  }

  private stopMonitoring(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.logger.log('Auto-recovery scanning stopped');
    }
  }
}
