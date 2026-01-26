import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { RentAgreement } from './rent-contract.entity';

@Entity('rent_payments')
export class RentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'pending' })
  status: string;

  @ManyToOne(() => RentAgreement, (contract) => contract.payments)
  contract: RentAgreement;

  @CreateDateColumn()
  paidAt: Date;
}