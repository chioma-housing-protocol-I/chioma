import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StellarAccount } from './stellar-account.entity';
import { AssetType } from './stellar-transaction.entity';

export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface ReleaseConditions {
  timelock?: {
    releaseAfter?: string; // ISO date string
    expireAfter?: string; // ISO date string
  };
  multiSig?: {
    requiredSignatures: number;
    signers: string[]; // public keys
  };
  conditions?: {
    type: string;
    description: string;
    fulfilled: boolean;
    fulfilledAt?: string;
  }[];
}

@Entity('stellar_escrows')
@Index('IDX_stellar_escrows_source_account', ['sourceAccountId'])
@Index('IDX_stellar_escrows_destination_account', ['destinationAccountId'])
@Index('IDX_stellar_escrows_status', ['status'])
@Index('IDX_stellar_escrows_expiration', ['expirationDate'])
export class StellarEscrow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'escrow_account_id', unique: true })
  escrowAccountId: number;

  @OneToOne(() => StellarAccount)
  @JoinColumn({ name: 'escrow_account_id' })
  escrowAccount: StellarAccount;

  @Column({ name: 'source_account_id' })
  sourceAccountId: number;

  @ManyToOne(() => StellarAccount)
  @JoinColumn({ name: 'source_account_id' })
  sourceAccount: StellarAccount;

  @Column({ name: 'destination_account_id' })
  destinationAccountId: number;

  @ManyToOne(() => StellarAccount)
  @JoinColumn({ name: 'destination_account_id' })
  destinationAccount: StellarAccount;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: string;

  @Column({ name: 'asset_type', length: 16 })
  assetType: AssetType;

  @Column({ name: 'asset_code', type: 'varchar', length: 12, nullable: true })
  assetCode: string | null;

  @Column({ name: 'asset_issuer', type: 'varchar', length: 56, nullable: true })
  assetIssuer: string | null;

  @Column({ name: 'sequence_number', type: 'bigint' })
  sequenceNumber: string;

  @Column({ length: 20 })
  status: EscrowStatus;

  @Column({ name: 'release_conditions', type: 'jsonb', nullable: true })
  releaseConditions: ReleaseConditions | null;

  @Column({ name: 'expiration_date', type: 'timestamp', nullable: true })
  expirationDate: Date | null;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'refunded_at', type: 'timestamp', nullable: true })
  refundedAt: Date | null;

  @Column({
    name: 'release_transaction_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  releaseTransactionHash: string | null;

  @Column({
    name: 'refund_transaction_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  refundTransactionHash: string | null;

  @Column({ name: 'rent_agreement_id', type: 'uuid', nullable: true })
  rentAgreementId: string | null;

  // Blockchain integration fields
  @Column({
    name: 'blockchain_escrow_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  blockchainEscrowId: string | null;

  @Column({
    name: 'on_chain_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  onChainStatus: string | null;

  @Column({
    name: 'escrow_contract_address',
    type: 'varchar',
    length: 56,
    nullable: true,
  })
  escrowContractAddress: string | null;

  @Column({
    name: 'arbiter_address',
    type: 'varchar',
    length: 56,
    nullable: true,
  })
  arbiterAddress: string | null;

  @Column({ name: 'dispute_id', type: 'uuid', nullable: true })
  disputeId: string | null;

  @Column({ name: 'dispute_reason', type: 'text', nullable: true })
  disputeReason: string | null;

  @Column({ name: 'blockchain_synced_at', type: 'timestamp', nullable: true })
  blockchainSyncedAt: Date | null;

  @Column({ name: 'approval_count', type: 'int', default: 0 })
  approvalCount: number;

  @Column({ name: 'escrow_metadata', type: 'jsonb', nullable: true })
  escrowMetadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
