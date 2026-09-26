import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, MoreThanOrEqual, Repository } from 'typeorm';
import {
  AlertSeverity,
  PerformanceAlert,
} from './entities/performance-alert.entity';

export interface ThresholdBreach {
  metric: string;
  severity: AlertSeverity;
  message: string;
  value?: number;
  threshold?: number;
}

export interface AlertQuery {
  severity?: AlertSeverity;
  resolved?: boolean;
  since?: Date;
  limit?: number;
}

@Injectable()
export class PerformanceAlertService {
  private readonly logger = new Logger(PerformanceAlertService.name);

  constructor(
    @InjectRepository(PerformanceAlert)
    private readonly repo: Repository<PerformanceAlert>,
  ) {}

  /** Persist a breach, folding repeats into the open alert for the same metric. */
  async recordBreach(breach: ThresholdBreach): Promise<PerformanceAlert> {
    const open = await this.repo.findOne({
      where: { metric: breach.metric, resolved: false },
    });
    if (open) {
      open.occurrences += 1;
      open.lastSeenAt = new Date();
      open.value = breach.value ?? open.value;
      open.message = breach.message;
      return this.repo.save(open);
    }
    this.logger.warn(`Threshold breach: ${breach.message}`);
    return this.repo.save(
      this.repo.create({ ...breach, lastSeenAt: new Date() }),
    );
  }

  getAlerts(query: AlertQuery = {}): Promise<PerformanceAlert[]> {
    const where: FindOptionsWhere<PerformanceAlert> = {};
    if (query.severity) where.severity = query.severity;
    if (query.resolved !== undefined) where.resolved = query.resolved;
    if (query.since) where.lastSeenAt = MoreThanOrEqual(query.since);
    return this.repo.find({
      where,
      order: { lastSeenAt: 'DESC' },
      take: Math.min(query.limit ?? 100, 500),
    });
  }

  async resolve(id: string): Promise<PerformanceAlert> {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.resolved = true;
    alert.resolvedAt = new Date();
    return this.repo.save(alert);
  }
}
