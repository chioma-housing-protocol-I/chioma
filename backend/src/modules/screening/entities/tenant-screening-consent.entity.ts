import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserScreeningProvider } from '../screening.enums';

@Entity('tenant_screening_consents')
@Index(['screeningId'])
export class TenantScreeningConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'screening_id', type: 'uuid' })
  screeningId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: UserScreeningProvider,
  })
  provider: UserScreeningProvider;

  @Column({ name: 'consent_text_version', type: 'varchar' })
  consentTextVersion: string;

  @Column({ name: 'granted_at', type: 'timestamp' })
  grantedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
