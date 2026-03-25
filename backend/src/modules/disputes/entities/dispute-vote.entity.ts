import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { Arbiter } from './arbiter.entity';

@Entity('dispute_votes')
export class DisputeVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dispute_id' })
  disputeId: number;

  @ManyToOne(() => Dispute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dispute_id' })
  dispute: Dispute;

  @Column({ name: 'arbiter_id' })
  arbiterId: number;

  @ManyToOne(() => Arbiter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'arbiter_id' })
  arbiter: Arbiter;

  @Column({ name: 'favor_landlord' })
  favorLandlord: boolean;

  @Column({ name: 'blockchain_voted_at', type: 'bigint', nullable: true })
  blockchainVotedAt: number;

  @Column({ name: 'transaction_hash', nullable: true })
  transactionHash: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
