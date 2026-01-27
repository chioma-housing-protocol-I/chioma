import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type AnchorTransactionType = 'deposit' | 'withdrawal';
export type AnchorTransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type PaymentMethod = 'SEPA' | 'SWIFT' | 'ACH';

@Entity('anchor_transactions')
export class AnchorTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['deposit', 'withdrawal'],
  })
  type: AnchorTransactionType;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: AnchorTransactionStatus;

  @Column('decimal', { precision: 20, scale: 8 })
  amount: number;

  @Column({ length: 3 })
  fiatCurrency: string; // USD, EUR, GBP, NGN

  @Column({ nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  walletAddress: string;

  @Column({ nullable: true })
  destination: string; // Bank account details for withdrawal

  @Column({ nullable: true })
  anchorTransactionId: string; // ID from anchor provider

  @Column({ nullable: true })
  stellarTransactionHash: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  usdcAmount: number;

  @Column({ type: 'json', nullable: true })
  anchorResponse: any; // Store anchor API responses

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  anchorProvider: string; // MoneyGram, local exchange, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}