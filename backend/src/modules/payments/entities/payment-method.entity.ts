import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type PaymentMethodMetadata = Record<string, unknown>;

@Entity('payment_methods')
@Index('idx_payment_methods_user_id', ['userId'])
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ length: 20 })
  paymentType: string; // CREDIT_CARD, BANK_TRANSFER, etc.

  @Column({ length: 4, nullable: true })
  lastFour: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: PaymentMethodMetadata | null;

  @Column({ type: 'text', nullable: true })
  encryptedMetadata: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
