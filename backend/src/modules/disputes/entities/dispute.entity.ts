import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';
import { User } from '../../users/entities/user.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { DisputeComment } from './dispute-comment.entity';

export enum DisputeType {
  RENT_PAYMENT = 'RENT_PAYMENT',
  SECURITY_DEPOSIT = 'SECURITY_DEPOSIT',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  LEASE_VIOLATION = 'LEASE_VIOLATION',
  OTHER = 'OTHER',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dispute_id', type: 'varchar', length: 36, unique: true })
  disputeId: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RentAgreement, { nullable: false })
  @JoinColumn({ name: 'agreement_id' })
  agreement: RentAgreement;

  @Column({ name: 'initiated_by', type: 'uuid' })
  initiatedById: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'initiated_by' })
  initiatedBy: User;

  @Column({ name: 'dispute_type', type: 'varchar', length: 50 })
  disputeType: DisputeType;

  @Column({
    name: 'requested_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  requestedAmount: number;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution: string;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: User;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => DisputeEvidence, (evidence) => evidence.dispute, { cascade: true })
  evidence: DisputeEvidence[];

  @OneToMany(() => DisputeComment, (comment) => comment.dispute, { cascade: true })
  comments: DisputeComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
