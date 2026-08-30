import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MaintenanceStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * SLA escalation progress for a request. NONE means no SLA window has been
 * breached yet; LANDLORD/ADMIN record the highest tier already notified so
 * the SLA sweep never re-sends the same escalation twice.
 */
export enum SlaEscalationTier {
  NONE = 'NONE',
  LANDLORD = 'LANDLORD',
  ADMIN = 'ADMIN',
}

@Entity('maintenance_requests')
export class MaintenanceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @Column()
  tenantId: string;

  @Column()
  landlordId: string;

  @Column()
  category: string;

  @Column('text')
  description: string;

  @Column({ default: 'MEDIUM' })
  priority: string;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.OPEN,
  })
  status: MaintenanceStatus;

  @Column('simple-array', { nullable: true })
  mediaUrls: string[];

  /**
   * Deadline for the landlord/agent to respond (i.e. move the request out of
   * OPEN) before the response SLA is considered breached. Computed from
   * `createdAt` + the configured response window for `priority`.
   */
  @Column({ type: 'timestamp', nullable: true })
  responseDueAt: Date | null;

  /**
   * Deadline for the request to reach RESOLVED/CLOSED before the resolution
   * SLA is considered breached. Computed from `createdAt` + the configured
   * resolution window for `priority`.
   */
  @Column({ type: 'timestamp', nullable: true })
  resolutionDueAt: Date | null;

  @Column({
    type: 'enum',
    enum: SlaEscalationTier,
    default: SlaEscalationTier.NONE,
  })
  slaEscalationTier: SlaEscalationTier;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
