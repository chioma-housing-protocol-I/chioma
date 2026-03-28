import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Payment } from './payment.entity';
import { RentObligationNft } from '../../agreements/entities/rent-obligation-nft.entity';

export enum AgreementStatus {
  DRAFT = 'draft',
  PENDING_DEPOSIT = 'pending_deposit',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  DISPUTED = 'disputed',
}

@Entity('rent_agreements')
@Index(['propertyId', 'status'])
export class RentAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_number', unique: true, nullable: true })
  agreementNumber: string;

  // Party References
  @Column({ name: 'property_id', nullable: true })
  propertyId: string;

  @Column({ name: 'landlord_id', nullable: true })
  landlordId: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: string;

  // Stellar Account Public Keys
  @Column({ name: 'landlord_stellar_pub_key', length: 56, nullable: true })
  landlordStellarPubKey: string;

  @Column({ name: 'tenant_stellar_pub_key', length: 56, nullable: true })
  tenantStellarPubKey: string;

  @Column({ name: 'agent_stellar_pub_key', length: 56, nullable: true })
  agentStellarPubKey: string;

  @Column({ name: 'escrow_account_pub_key', length: 56, nullable: true })
  escrowAccountPubKey: string;

  // Financial Terms
  @Column({
    name: 'monthly_rent',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyRent: number;

  @Column({
    name: 'security_deposit',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  securityDeposit: number;

  @Column({
    name: 'agent_commission_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 10.0,
  })
  agentCommissionRate: number;

  @Column({
    name: 'escrow_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  escrowBalance: number;

  @Column({
    name: 'total_paid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  totalPaid: number;

  // Lease Terms
  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ name: 'renewal_option', type: 'boolean', nullable: true })
  renewalOption: boolean | null;

  @Column({ name: 'renewal_notice_date', type: 'date', nullable: true })
  renewalNoticeDate: Date | null;

  @Column({ name: 'move_in_date', type: 'date', nullable: true })
  moveInDate: Date | null;

  @Column({ name: 'move_out_date', type: 'date', nullable: true })
  moveOutDate: Date | null;

  @Column({ name: 'utilities_included', type: 'boolean', nullable: true })
  utilitiesIncluded: boolean | null;

  @Column({
    name: 'maintenance_responsibility',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  maintenanceResponsibility: string | null;

  @Column({
    name: 'early_termination_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  earlyTerminationFee: number | null;

  @Column({
    name: 'late_fee_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  lateFeePercentage: number | null;

  @Column({ name: 'grace_period_days', type: 'int', nullable: true })
  gracePeriodDays: number | null;

  @Column({ name: 'last_payment_date', type: 'timestamp', nullable: true })
  lastPaymentDate: Date;

  // Terms and Conditions
  @Column({ name: 'terms_and_conditions', type: 'text', nullable: true })
  termsAndConditions: string;

  // Status Management
  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: AgreementStatus.DRAFT,
  })
  status: AgreementStatus;

  @Column({ name: 'termination_date', type: 'timestamp', nullable: true })
  terminationDate: Date;

  @Column({ name: 'termination_reason', type: 'text', nullable: true })
  terminationReason: string;

  // Blockchain Integration
  @Column({ name: 'blockchain_agreement_id', nullable: true })
  blockchainAgreementId: string;

  @Column({ name: 'on_chain_status', nullable: true })
  onChainStatus: string;

  @Column({ name: 'transaction_hash', nullable: true })
  transactionHash: string;

  @Column({ name: 'blockchain_synced_at', type: 'timestamp', nullable: true })
  blockchainSyncedAt: Date;

  @Column({ name: 'payment_split_config', type: 'jsonb', nullable: true })
  paymentSplitConfig: any;

  // Relationships
  @OneToMany(() => Payment, (payment) => payment.agreement)
  payments: Payment[];

  @OneToMany(() => RentObligationNft, (nft) => nft.agreement)
  rentObligationNfts: RentObligationNft[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
