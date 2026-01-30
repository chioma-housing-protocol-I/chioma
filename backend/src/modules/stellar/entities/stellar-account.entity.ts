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
import { Exclude } from 'class-transformer';

export enum StellarAccountType {
  USER = 'USER',
  ESCROW = 'ESCROW',
  FEE = 'FEE',
  PLATFORM = 'PLATFORM',
}

@Entity('stellar_accounts')
@Index('IDX_stellar_accounts_user_id', ['userId'])
@Index('IDX_stellar_accounts_account_type', ['accountType'])
export class StellarAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'public_key', type: 'varchar', length: 56, unique: true })
  publicKey: string;

  @Exclude()
  @Column({ name: 'secret_key_encrypted', type: 'text' })
  secretKeyEncrypted: string;

  @Column({ name: 'sequence_number', type: 'bigint', default: 0 })
  sequenceNumber: string;

  @Column({
    name: 'account_type',
    type: 'varchar',
    length: 20,
  })
  accountType: StellarAccountType;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 20, scale: 7, default: 0 })
  balance: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
