import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DisputeVote } from './dispute-vote.entity';
import { User } from '../../users/entities/user.entity';

@Entity('arbiters')
@Index('IDX_arbiters_stellar_address', ['stellarAddress'])
@Index('IDX_arbiters_active', ['active'])
@Index('IDX_arbiters_reputation_score', ['reputationScore'])
export class Arbiter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    name: 'stellar_address',
    type: 'varchar',
    length: 100,
  })
  stellarAddress: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'blockchain_added_at', type: 'bigint', nullable: true })
  blockchainAddedAt: number | null;

  @Column({
    name: 'transaction_hash',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionHash: string | null;

  @Column({ name: 'total_votes', default: 0 })
  totalVotes: number;

  @Column({ name: 'total_disputes_resolved', default: 0 })
  totalDisputesResolved: number;

  @Column({
    name: 'reputation_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  reputationScore: number;

  @Column({ name: 'successful_resolutions', default: 0 })
  successfulResolutions: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    qualifications?: string;
    specialization?: string;
    stakeAmount?: string;
    [key: string]: any;
  } | null;

  @OneToMany(() => DisputeVote, (vote) => vote.arbiter)
  votes: DisputeVote[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
