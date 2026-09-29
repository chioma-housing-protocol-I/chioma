import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface ServiceDependency {
  name: string;
  dependsOn: string[];
}

export interface CascadeEvent {
  timestamp: number;
  failedService: string;
  affectedServices: string[];
  depth: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detects cascading failures across multiple services.
 * Identifies when failure in one service propagates to dependent services.
 */
@Injectable()
export class CascadeDetectorService extends EventEmitter {
  private readonly logger = new Logger(CascadeDetectorService.name);
  private serviceMap = new Map<string, Set<string>>();
  private failureTimestamps = new Map<string, number>();
  private cascadeThresholdMs = 5_000; // Failures within 5s are considered cascading
  private recentCascades: CascadeEvent[] = [];
  private maxCascadeHistory = 100;

  /**
   * Register service dependencies for cascade detection
   */
  registerDependencies(dependencies: ServiceDependency[]): void {
    dependencies.forEach((dep) => {
      this.serviceMap.set(dep.name, new Set(dep.dependsOn));
    });
    this.logger.debug(
      `Registered ${dependencies.length} service dependencies for cascade detection`,
    );
  }

  /**
   * Record a service failure and detect cascades
   */
  recordFailure(serviceName: string): void {
    const now = Date.now();
    this.failureTimestamps.set(serviceName, now);

    // Find all services that depend on the failed service
    const affectedServices = this.findDependentServices(serviceName);

    if (affectedServices.length > 0) {
      const cascade = this.detectCascade(serviceName, affectedServices, now);

      if (cascade) {
        this.recentCascades.push(cascade);
        if (this.recentCascades.length > this.maxCascadeHistory) {
          this.recentCascades.shift();
        }

        this.logger.warn(
          `Cascade detected: ${serviceName} failure affecting ${affectedServices.join(', ')}`,
          cascade,
        );
        this.emit('cascade_detected', cascade);
      }
    }

    this.cleanupOldFailures();
  }

  /**
   * Record service recovery
   */
  recordRecovery(serviceName: string): void {
    this.failureTimestamps.delete(serviceName);
    this.logger.log(`Service ${serviceName} recovered`);
    this.emit('service_recovered', { serviceName });
  }

  /**
   * Get current cascade status
   */
  getCascadeStatus(): {
    isInCascade: boolean;
    failedServices: string[];
    recentCascades: CascadeEvent[];
  } {
    return {
      isInCascade: this.failureTimestamps.size > 0,
      failedServices: Array.from(this.failureTimestamps.keys()),
      recentCascades: this.recentCascades.slice(-10),
    };
  }

  /**
   * Get cascade history
   */
  getCascadeHistory(): CascadeEvent[] {
    return [...this.recentCascades];
  }

  private findDependentServices(serviceName: string): string[] {
    const dependents: string[] = [];

    this.serviceMap.forEach((dependencies, service) => {
      if (dependencies.has(serviceName)) {
        dependents.push(service);
      }
    });

    return dependents;
  }

  private detectCascade(
    failedService: string,
    affectedServices: string[],
    timestamp: number,
  ): CascadeEvent | null {
    // Check if any affected services have already failed recently
    const recentFailures = affectedServices.filter((service) => {
      const failureTime = this.failureTimestamps.get(service);
      if (!failureTime) return false;
      return timestamp - failureTime < this.cascadeThresholdMs;
    });

    if (recentFailures.length === 0) {
      return null;
    }

    const depth = this.calculateCascadeDepth(failedService);
    const severity = this.calculateCascadeSeverity(
      failedService,
      affectedServices,
    );

    return {
      timestamp,
      failedService,
      affectedServices,
      depth,
      severity,
    };
  }

  private calculateCascadeDepth(serviceName: string): number {
    let depth = 0;
    let current = serviceName;
    const visited = new Set<string>();

    while (current) {
      const dependencies = this.serviceMap.get(current);
      if (!dependencies || dependencies.size === 0) {
        break;
      }

      // Find the first failed dependency
      let nextFailed: string | undefined;
      for (const dep of dependencies) {
        if (this.failureTimestamps.has(dep) && !visited.has(dep)) {
          nextFailed = dep;
          break;
        }
      }

      if (!nextFailed) {
        break;
      }

      visited.add(nextFailed);
      current = nextFailed;
      depth++;
    }

    return depth;
  }

  private calculateCascadeSeverity(
    failedService: string,
    affectedServices: string[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical services
    const criticalServices = [
      'database',
      'cache',
      'auth',
      'payment',
      'blockchain',
    ];

    const isCriticalFailed = criticalServices.some(
      (svc) =>
        failedService.toLowerCase().includes(svc) ||
        affectedServices.some((a) => a.toLowerCase().includes(svc)),
    );

    if (isCriticalFailed) {
      return 'critical';
    }

    if (affectedServices.length >= 5) {
      return 'high';
    }

    if (affectedServices.length >= 3) {
      return 'medium';
    }

    return 'low';
  }

  private cleanupOldFailures(): void {
    const now = Date.now();
    const expirationMs = 60_000; // Clean up failures older than 1 minute

    const toDelete: string[] = [];
    this.failureTimestamps.forEach((timestamp, service) => {
      if (now - timestamp > expirationMs) {
        toDelete.push(service);
      }
    });

    toDelete.forEach((service) => {
      this.failureTimestamps.delete(service);
    });
  }
}
