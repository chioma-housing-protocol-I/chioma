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

  /**
   * SEP-9 fields, encrypted. Nulled out by the retention purge job once the
   * decision has stood for the configured retention window; `documentHash`
   * and the decision fields below survive the purge.
   */
  @Encrypted({ nullable: true })
  encryptedKycData: Record<string, any> | null;

  @Column({ type: 'int', default: 1 })
  encryptionVersion: number;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status: KycStatus;

  @Column({ type: 'text', nullable: true })
  providerReference: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /**
   * Non-reversible SHA-256 checksum of the plaintext KYC payload, recorded
   * at submission time. Retained after the raw document is purged so the
   * decision can still be tied to the exact data it was made on.
   */
  @Column({ type: 'text', nullable: true })
  documentHash: string | null;

  /** When the raw document was purged by the retention job, if ever. */
  @Column({ type: 'timestamp', nullable: true })
  documentPurgedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
