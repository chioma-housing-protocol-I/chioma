import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Dispute } from './dispute.entity';

export enum SettlementOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COUNTERED = 'COUNTERED',
  WITHDRAWN = 'WITHDRAWN',
}

/**
 * A settlement proposed by one dispute party to the other. Countering an
 * offer marks it COUNTERED and creates a new PENDING offer that points back
 * via `parentOfferId`, so the full negotiation history is preserved.
 */
@Entity('dispute_settlement_offers')
@Index('IDX_settlement_offers_dispute_id', ['disputeId'])
export class SettlementOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'dispute_id', type: 'int' })
  disputeId: number;

  @ManyToOne(() => Dispute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispute_id' })
  dispute: Dispute;

  @Column({ name: 'proposed_by', type: 'uuid' })
  proposedBy: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'text' })
  terms: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SettlementOfferStatus.PENDING,
  })
  status: SettlementOfferStatus;

  @Column({ name: 'parent_offer_id', type: 'uuid', nullable: true })
  parentOfferId: string | null;

  @Column({ name: 'response_note', type: 'text', nullable: true })
  responseNote: string | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
