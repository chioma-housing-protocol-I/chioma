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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
