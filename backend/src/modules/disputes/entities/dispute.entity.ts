import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';
import { User } from '../../users/entities/user.entity';
import { DisputeEvidence } from './dispute-evidence.entity';
import { DisputeComment } from './dispute-comment.entity';

export enum DisputeType {
  RENT_PAYMENT = 'RENT_PAYMENT',
  SECURITY_DEPOSIT = 'SECURITY_DEPOSIT',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  MAINTENANCE = 'MAINTENANCE',
  TERMINATION = 'TERMINATION',
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
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dispute_id', unique: true })
  disputeId: string;

  @Column({ name: 'agreement_id' })
  agreementId: number;

  @ManyToOne(() => RentAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreement_id' })
  agreement: RentAgreement;

  @Column({ name: 'initiated_by' })
  initiatedBy: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiated_by' })
  initiator: User;

  @Column({
    name: 'dispute_type',
    type: 'varchar',
    length: 50,
  })
  disputeType: DisputeType;

  @Column({
    name: 'requested_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  requestedAmount: number;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @OneToMany(() => DisputeEvidence, (evidence: any) => evidence.dispute, {
    cascade: true,
  })
  evidence: DisputeEvidence[];

  @OneToMany(() => DisputeComment, (comment: any) => comment.dispute, {
    cascade: true,
  })
  comments: DisputeComment[];

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
