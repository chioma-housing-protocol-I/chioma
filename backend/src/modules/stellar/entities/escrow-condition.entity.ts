import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StellarEscrow } from './stellar-escrow.entity';

export enum ConditionType {
  TIME_LOCK = 'time_lock',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  EXTERNAL_VALIDATION = 'external_validation',
  MILESTONE_COMPLETION = 'milestone_completion',
  MULTI_SIGNATURE = 'multi_signature',
  PAYMENT_VERIFICATION = 'payment_verification',
}

@Entity('escrow_conditions')
@Index('IDX_escrow_conditions_escrow_id', ['escrowId'])
@Index('IDX_escrow_conditions_type', ['conditionType'])
@Index('IDX_escrow_conditions_satisfied', ['satisfied'])
export class EscrowCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'escrow_id' })
  escrowId: number;

  @ManyToOne(() => StellarEscrow, (escrow) => escrow.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'escrow_id' })
  escrow: StellarEscrow;

  @Column({
    name: 'condition_type',
    type: 'varchar',
    length: 50,
  })
  conditionType: ConditionType;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>;

  @Column({ default: false })
  satisfied: boolean;

  @Column({ name: 'satisfied_at', type: 'timestamp', nullable: true })
  satisfiedAt: Date | null;

  @Column({ default: true })
  required: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'validation_result', type: 'jsonb', nullable: true })
  validationResult: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
