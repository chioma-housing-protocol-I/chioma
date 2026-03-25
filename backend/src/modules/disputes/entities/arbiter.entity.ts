import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('arbiters')
export class Arbiter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, name: 'stellar_address' })
  stellarAddress: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'blockchain_added_at', type: 'bigint', nullable: true })
  blockchainAddedAt: number;

  @Column({ name: 'transaction_hash', nullable: true })
  transactionHash: string;

  @Column({ name: 'total_votes', default: 0 })
  totalVotes: number;

  @Column({ name: 'total_disputes_resolved', default: 0 })
  totalDisputesResolved: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
