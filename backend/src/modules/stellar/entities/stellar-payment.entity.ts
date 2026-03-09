import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

@Entity('stellar_payments')
@Index('IDX_stellar_payments_agreement_id', ['agreementId'])
@Index('IDX_stellar_payments_status', ['status'])
export class StellarPayment {
  @PrimaryGeneratedColumn('uuid')
  paymentId: string;

  @Column({ name: 'agreement_id', type: 'varchar' })
  agreementId: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: string;

  @Column({ name: 'tenant_address', type: 'varchar', length: 56 })
  tenantAddress: string;

  @Column({ name: 'landlord_address', type: 'varchar', length: 56 })
  landlordAddress: string;

  @Column({ name: 'platform_fee_collector', type: 'varchar', length: 56 })
  platformFeeCollector: string;

  @Column({ name: 'payment_date', type: 'timestamp' })
  paymentDate: Date;

  @Column({ name: 'token_address', type: 'varchar', length: 56 })
  tokenAddress: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    name: 'transaction_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  transactionHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
