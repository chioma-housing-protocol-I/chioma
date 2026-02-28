import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Generated,
} from 'typeorm';
import { RentAgreement } from './rent-contract.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id', unique: true })
  @Generated('uuid')
  paymentId: string;

  @Column({ name: 'agreement_id' })
  agreementId: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount: number;

  @Column({
    name: 'payment_date',
    type: process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamp',
  })
  paymentDate: Date;

  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  // Relationship
  @ManyToOne(() => RentAgreement, (agreement) => agreement.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agreement_id' })
  agreement: RentAgreement;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
