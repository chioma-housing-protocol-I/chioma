import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Encrypted } from '../security/decorators/encrypted.decorator';
import { KycStatus } from './kyc-status.enum';

@Entity('kyc')
export class Kyc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Encrypted({ nullable: false })
  encryptedKycData: Record<string, any>; // SEP-9 fields, encrypted

  @Column({ type: 'int', default: 1 })
  encryptionVersion: number;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ type: 'text', nullable: true })
  providerReference: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
