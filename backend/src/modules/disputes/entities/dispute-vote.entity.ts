import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Dispute } from './dispute.entity';
import { Arbiter } from './arbiter.entity';

@Entity('dispute_votes')
@Index('IDX_dispute_votes_dispute_arbiter', ['disputeId', 'arbiterId'], {
  unique: true,
})
@Index('IDX_dispute_votes_dispute_id', ['disputeId'])
@Index('IDX_dispute_votes_arbiter_id', ['arbiterId'])
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

  @ManyToOne(() => Arbiter, (arbiter) => arbiter.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'arbiter_id' })
  arbiter: Arbiter;

  @Column({ name: 'favor_landlord' })
  favorLandlord: boolean;

  @Column({ name: 'blockchain_voted_at', type: 'bigint', nullable: true })
  blockchainVotedAt: number | null;

  @Column({
    name: 'transaction_hash',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionHash: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  evidence: string | null;

  @Column({ type: 'text', nullable: true })
  reasoning: string | null;

  @Column({ name: 'vote_weight', type: 'int', default: 1 })
  voteWeight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
