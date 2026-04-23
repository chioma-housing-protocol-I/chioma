import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudAlertEntity } from './entities/fraud-alert.entity';
import { FraudAlert, FraudScoreResult, FraudSubjectType } from './fraud.types';

@Injectable()
export class FraudAlertsService {
  constructor(
    @InjectRepository(FraudAlertEntity)
    private readonly fraudAlertRepository: Repository<FraudAlertEntity>,
  ) {}

  async createAlert(
    subjectType: FraudSubjectType,
    subjectId: string,
    scoreResult: FraudScoreResult,
  ): Promise<FraudAlert | null> {
    if (scoreResult.decision === 'allow') {
      return null;
    }

    const row = this.fraudAlertRepository.create({
      subjectType,
      subjectId,
      score: scoreResult.score,
      decision: scoreResult.decision,
      reasons: scoreResult.reasons,
      modelVersion: scoreResult.modelVersion,
      features: scoreResult.features,
      status: 'open',
      resolvedAt: null,
    });
    const saved = await this.fraudAlertRepository.save(row);
    return this.toDto(saved);
  }

  async listAlerts(status?: 'open' | 'resolved'): Promise<FraudAlert[]> {
    const rows = await this.fraudAlertRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async resolveAlert(id: string): Promise<FraudAlert> {
    const row = await this.fraudAlertRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Fraud alert not found');
    }
    if (row.status === 'resolved') {
      return this.toDto(row);
    }
    row.status = 'resolved';
    row.resolvedAt = new Date();
    const saved = await this.fraudAlertRepository.save(row);
    return this.toDto(saved);
  }

  private toDto(row: FraudAlertEntity): FraudAlert {
    return {
      id: row.id,
      subjectType: row.subjectType as FraudSubjectType,
      subjectId: row.subjectId,
      score: row.score,
      decision: row.decision as FraudAlert['decision'],
      reasons: row.reasons,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : undefined,
      status: row.status as FraudAlert['status'],
    };
  }
}
