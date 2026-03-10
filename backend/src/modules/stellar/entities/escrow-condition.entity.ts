import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { StellarEscrow } from './stellar-escrow.entity';

export enum ConditionType {
  TIME_LOCK = 'time_lock',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  EXTERNAL_VALIDATION = 'external_validation',
  MILESTONE_COMPLETION = 'milestone_completion',
}

@Entity('stellar_escrow_conditions')
@Index('IDX_escrow_conditions_escrow_id', ['escrowId'])
@Index('IDX_escrow_conditions_type', ['conditionType'])
@Index('IDX_escrow_conditions_stellar_escrow_id', ['stellarEscrowId'])
export class EscrowConditionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // On-chain escrow identifier (e.g. Soroban BytesN<32> hex string)
  @Column({ name: 'escrow_id', type: 'varchar', length: 128 })
  escrowId: string;

  @Column({ name: 'stellar_escrow_id', type: 'int', nullable: true })
  stellarEscrowId: number | null;

  @Column({
    name: 'condition_type',
    type: 'enum',
    enum: ConditionType,
  })
  conditionType: ConditionType;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  satisfied: boolean;

  @Column({ name: 'satisfied_at', type: 'timestamp', nullable: true })
  satisfiedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  required: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => StellarEscrow, (escrow) => escrow.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stellar_escrow_id' })
  escrow: StellarEscrow;
}

// Backwards-compatible alias matching the issue specification
export { EscrowConditionEntity as EscrowCondition };
