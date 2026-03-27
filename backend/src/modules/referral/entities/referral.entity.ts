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
import { User } from '../../users/entities/user.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REWARDED = 'rewarded',
  CANCELLED = 'cancelled',
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'referrer_id', type: 'uuid' })
  @Index()
  referrerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  @Column({ name: 'referred_id', type: 'uuid', unique: true })
  @Index()
  referredId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'referred_id' })
  referred: User;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({
    name: 'reward_amount',
    type: 'decimal',
    precision: 20,
    scale: 7,
    default: 0,
  })
  rewardAmount: number;

  @Column({
    name: 'reward_tx_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  rewardTxHash: string | null;

  @Column({ name: 'converted_at', type: 'timestamp', nullable: true })
  convertedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
