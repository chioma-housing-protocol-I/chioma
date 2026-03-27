import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantScreeningRiskLevel } from '../screening.enums';

@Entity('tenant_screening_reports')
@Index(['screeningId'], { unique: true })
export class TenantScreeningReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'screening_id', type: 'uuid' })
  screeningId: string;

  @Column({ name: 'provider_report_id', type: 'varchar', nullable: true })
  providerReportId?: string | null;

  @Column({ name: 'encrypted_report', type: 'text' })
  encryptedReport: string;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: TenantScreeningRiskLevel,
    nullable: true,
  })
  riskLevel?: TenantScreeningRiskLevel | null;

  @Column({ name: 'access_expires_at', type: 'timestamp', nullable: true })
  accessExpiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
