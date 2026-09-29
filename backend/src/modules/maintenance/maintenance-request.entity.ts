import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './entities/vendor.entity';

export enum MaintenanceStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  COST_PENDING = 'COST_PENDING',
  COST_APPROVED = 'COST_APPROVED',
  PAID = 'PAID',
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

  @Column({ nullable: true })
  vendorId: string | null;

  @ManyToOne(() => Vendor, { nullable: true, eager: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  estimatedCost: number | null;

  @Column('text', { nullable: true })
  costNotes: string | null;

  @Column({ nullable: true })
  costApprovedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  costApprovedAt: Date | null;

  @Column({ nullable: true })
  costRejectionReason: string | null;

  @Column({ nullable: true })
  paymentId: string | null;
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
