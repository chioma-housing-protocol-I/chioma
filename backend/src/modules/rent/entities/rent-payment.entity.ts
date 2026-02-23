import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { RentAgreement } from './rent-contract.entity';

@Entity('rent_payments')
export class RentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: 'pending' })
  status: string;

  @ManyToOne(() => RentAgreement, (agreement) => agreement.payments)
  agreement: RentAgreement;

  @CreateDateColumn({ type: 'timestamp' })
  paidAt: Date;
}
