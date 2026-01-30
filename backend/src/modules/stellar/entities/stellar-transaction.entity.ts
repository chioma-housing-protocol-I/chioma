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
import { StellarAccount } from './stellar-account.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AssetType {
  NATIVE = 'NATIVE',
  CREDIT_ALPHANUM4 = 'CREDIT_ALPHANUM4',
  CREDIT_ALPHANUM12 = 'CREDIT_ALPHANUM12',
}

export enum MemoType {
  NONE = 'NONE',
  TEXT = 'TEXT',
  ID = 'ID',
  HASH = 'HASH',
  RETURN = 'RETURN',
}

@Entity('stellar_transactions')
@Index('IDX_stellar_transactions_from_account', ['fromAccountId'])
@Index('IDX_stellar_transactions_to_account', ['toAccountId'])
@Index('IDX_stellar_transactions_status', ['status'])
@Index('IDX_stellar_transactions_created_at', ['createdAt'])
export class StellarTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'transaction_hash', length: 64, unique: true })
  transactionHash: string;

  @Column({ name: 'from_account_id', nullable: true })
  fromAccountId: number | null;

  @ManyToOne(() => StellarAccount, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: StellarAccount;

  @Column({ name: 'to_account_id', nullable: true })
  toAccountId: number | null;

  @ManyToOne(() => StellarAccount, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: StellarAccount;

  @Column({ name: 'asset_type', length: 16 })
  assetType: AssetType;

  @Column({ name: 'asset_code', type: 'varchar', length: 12, nullable: true })
  assetCode: string | null;

  @Column({ name: 'asset_issuer', type: 'varchar', length: 56, nullable: true })
  assetIssuer: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: string;

  @Column({ name: 'fee_paid', type: 'integer' })
  feePaid: number;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ name: 'memo_type', length: 10, nullable: true })
  memoType: MemoType | null;

  @Column({ length: 20 })
  status: TransactionStatus;

  @Column({ type: 'integer', nullable: true })
  ledger: number | null;

  @Column({
    name: 'source_account',
    type: 'varchar',
    length: 56,
    nullable: true,
  })
  sourceAccount: string | null;

  @Column({
    name: 'destination_account',
    type: 'varchar',
    length: 56,
    nullable: true,
  })
  destinationAccount: string | null;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  idempotencyKey: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
