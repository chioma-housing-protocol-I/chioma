import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('agent_transactions')
@Index('IDX_agent_transactions_agent', ['agentAddress'])
@Index('IDX_agent_transactions_completed', ['completed'])
export class AgentTransaction {
  @PrimaryColumn({ name: 'transaction_id', length: 128 })
  transactionId: string;

  @Column({ name: 'agent_address', length: 56 })
  agentAddress: string;

  @Column({ name: 'parties', type: 'simple-array' })
  parties: string[];

  @Column({ default: false })
  completed: boolean;

  @Column({
    name: 'blockchain_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  blockchainHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
