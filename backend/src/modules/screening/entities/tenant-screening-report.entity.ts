import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserScreeningRiskLevel } from '../screening.enums';

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
    enum: UserScreeningRiskLevel,
    nullable: true,
  })
  riskLevel?: UserScreeningRiskLevel | null;

  @Column({ name: 'access_expires_at', type: 'timestamp', nullable: true })
  accessExpiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
