import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type ComponentState = 'operational' | 'degraded' | 'major_outage';

export interface ComponentStatus {
  name: string;
  status: ComponentState;
  responseTimeMs?: number;
}

export interface UptimeInfo {
  /** Seconds since this service instance started. */
  seconds: number;
  since: string;
  /** Node process uptime in seconds. */
  processSeconds: number;
}

export interface StatusPage {
  status: ComponentState;
  description: string;
  components: ComponentStatus[];
  uptime: UptimeInfo;
  timestamp: string;
}

const STATUS_DESCRIPTIONS: Record<ComponentState, string> = {
  operational: 'All systems operational',
  degraded: 'Degraded performance',
  major_outage: 'Major service outage',
};

/**
 * Aggregates component health and uptime into a public status-page payload
 * suitable for status-page integrations and uptime monitors.
 */
@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);
  private readonly startedAt = new Date();

  constructor(private readonly dataSource: DataSource) {}

  async getStatusPage(): Promise<StatusPage> {
    const components: ComponentStatus[] = [
      { name: 'api', status: 'operational' },
      await this.checkDatabase(),
    ];

    const status = this.deriveOverallStatus(components);

    return {
      status,
      description: STATUS_DESCRIPTIONS[status],
      components,
      uptime: this.getUptime(),
      timestamp: new Date().toISOString(),
    };
  }

  getUptime(): UptimeInfo {
    const seconds = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    return {
      seconds,
      since: this.startedAt.toISOString(),
      processSeconds: Math.floor(process.uptime()),
    };
  }

  private async checkDatabase(): Promise<ComponentStatus> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        name: 'database',
        status: 'operational',
        responseTimeMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.warn(
        `Database status check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        name: 'database',
        status: 'major_outage',
        responseTimeMs: Date.now() - start,
      };
    }
  }

  private deriveOverallStatus(components: ComponentStatus[]): ComponentState {
    if (components.some((c) => c.status === 'major_outage')) {
      return 'major_outage';
    }
    if (components.some((c) => c.status === 'degraded')) {
      return 'degraded';
    }
    return 'operational';
  }
}
