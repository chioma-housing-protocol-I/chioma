import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ScreeningCheckType,
  TenantScreeningProvider,
  TenantScreeningStatus,
} from '../screening.enums';

@Entity('tenant_screening_requests')
@Index(['tenantId', 'status'])
@Index(['requestedByUserId', 'status'])
export class TenantScreeningRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId: string;

  @Column({
    type: 'enum',
    enum: TenantScreeningProvider,
  })
  provider: TenantScreeningProvider;

  @Column({
    name: 'requested_checks',
    type: 'simple-array',
  })
  requestedChecks: ScreeningCheckType[];

  @Column({
    type: 'enum',
    enum: TenantScreeningStatus,
    default: TenantScreeningStatus.PENDING_CONSENT,
  })
  status: TenantScreeningStatus;

  @Column({ name: 'consent_required', type: 'boolean', default: true })
  consentRequired: boolean;

  @Column({ name: 'consent_version', type: 'varchar' })
  consentVersion: string;

  @Column({ name: 'provider_reference', type: 'varchar', nullable: true })
  providerReference?: string | null;

  @Column({ name: 'encrypted_applicant_data', type: 'text' })
  encryptedApplicantData: string;

  @Column({ name: 'consent_granted_at', type: 'timestamp', nullable: true })
  consentGrantedAt?: Date | null;

  @Column({ name: 'consent_expires_at', type: 'timestamp', nullable: true })
  consentExpiresAt?: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason?: string | null;

  @Column({ name: 'report_summary', type: 'simple-json', nullable: true })
  reportSummary?: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
