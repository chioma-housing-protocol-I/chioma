import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
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
@Index('IDX_disputes_payment_id', ['paymentId'])
@Index('IDX_disputes_rent_payment_id', ['rentPaymentId'])
@Index('IDX_disputes_payment_reference_number', ['paymentReferenceNumber'])
export class Dispute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dispute_id', unique: true })
  disputeId: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @ManyToOne(() => RentAgreement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agreement_id' })
  agreement: RentAgreement;

  @Column({ name: 'initiated_by', type: 'uuid' })
  initiatedBy: string;

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

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

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

  @Column({ name: 'blockchain_agreement_id', nullable: true })
  blockchainAgreementId: string;

  @Column({ name: 'details_hash', nullable: true })
  detailsHash: string;

  @Column({ name: 'blockchain_raised_at', type: 'bigint', nullable: true })
  blockchainRaisedAt?: number;

  @Column({ name: 'blockchain_resolved_at', type: 'bigint', nullable: true })
  blockchainResolvedAt?: number;

  @Column({ name: 'votes_favor_landlord', default: 0 })
  votesFavorLandlord: number;

  @Column({ name: 'votes_favor_tenant', default: 0 })
  votesFavorTenant: number;

  @Column({ name: 'blockchain_outcome', nullable: true })
  blockchainOutcome: string;

  @Column({ name: 'transaction_hash', nullable: true })
  transactionHash: string;

  @Column({ name: 'blockchain_synced_at', type: 'timestamp', nullable: true })
  blockchainSyncedAt: Date;

  // Payment correlation fields for dispute resolution context
  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({
    name: 'rent_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  rentPaymentId: string | null;

  @Column({
    name: 'disputed_payment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  disputedPaymentAmount: number | null;

  @Column({
    name: 'payment_reference_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  paymentReferenceNumber: string | null;

  @Column({
    name: 'payment_date',
    type: process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamp',
    nullable: true,
  })
  paymentDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
