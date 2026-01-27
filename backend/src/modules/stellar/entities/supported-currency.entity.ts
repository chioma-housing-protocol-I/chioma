import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CurrencyType = 'fiat' | 'crypto';

@Entity('supported_currencies')
export class SupportedCurrency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10, unique: true })
  code: string; // USD, EUR, GBP, NGN, USDC

  @Column()
  name: string; // United States Dollar, Euro, etc.

  @Column({
    type: 'enum',
    enum: ['fiat', 'crypto'],
  })
  type: CurrencyType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  symbol: string; // $, €, £, ₦

  @Column('int', { nullable: true })
  decimalPlaces: number; // 2 for fiat, 7 for USDC

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  exchangeRateToUsd: number; // For fiat currencies

  @Column({ nullable: true })
  anchorAssetCode: string; // USDC for crypto

  @Column({ nullable: true })
  anchorAssetIssuer: string; // GA5ZSEJYB37J... for USDC

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}