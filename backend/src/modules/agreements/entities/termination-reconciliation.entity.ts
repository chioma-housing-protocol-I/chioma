import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Per-sub-step outcome of a termination reconciliation. `not_applicable`
 * covers the case where the sub-step legitimately does not apply to a given
 * agreement (e.g. no escrow was ever created for it), so a queryable row
 * never has to fake a `succeeded`/`failed` verdict for work that was never
 * attempted.
 */
export enum ReconciliationStepStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  NOT_APPLICABLE = 'not_applicable',
}

/**
 * Durable, queryable record of the reconciliation performed when a lease is
 * terminated: prorated final rent, security-deposit refund/escrow release,
 * and the system's own multisig approval for escrow release. One row per
 * termination attempt — a retry updates the same row's failed sub-step(s)
 * rather than creating a new one, so the row is always the single source of
 * truth for "what still needs to happen" for this agreement's termination.
 */
@Entity('termination_reconciliations')
@Index(['agreementId'], { unique: true })
export class TerminationReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId: string;

  @Column({ name: 'termination_date', type: 'timestamp' })
  terminationDate: Date;

  @Column({
    name: 'prorated_rent_owed',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  proratedRentOwed: number;

  @Column({
    name: 'deposit_refund_status',
    type: 'varchar',
    length: 20,
    default: ReconciliationStepStatus.PENDING,
  })
  depositRefundStatus: ReconciliationStepStatus;

  @Column({ name: 'deposit_refund_error', type: 'text', nullable: true })
  depositRefundError: string | null;

  @Column({
    name: 'escrow_release_status',
    type: 'varchar',
    length: 20,
    default: ReconciliationStepStatus.PENDING,
  })
  escrowReleaseStatus: ReconciliationStepStatus;

  @Column({ name: 'escrow_release_error', type: 'text', nullable: true })
  escrowReleaseError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
