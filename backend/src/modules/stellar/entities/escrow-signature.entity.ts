import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { StellarEscrow } from './stellar-escrow.entity';

@Entity('escrow_signatures')
@Index('IDX_escrow_signatures_escrow_id', ['escrowId'])
@Index('IDX_escrow_signatures_signer', ['signerAddress'])
@Index('IDX_escrow_signatures_escrow_signer', ['escrowId', 'signerAddress'], {
  unique: true,
})
export class EscrowSignature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'escrow_id' })
  escrowId: number;

  @ManyToOne(() => StellarEscrow, (escrow) => escrow.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'escrow_id' })
  escrow: StellarEscrow;

  @Column({ name: 'signer_address', type: 'varchar', length: 56 })
  signerAddress: string;

  @Column({ type: 'text' })
  signature: string;

  @CreateDateColumn({ name: 'signed_at' })
  signedAt: Date;

  @Column({ name: 'is_valid', default: true })
  isValid: boolean;

  @Column({
    name: 'signature_type',
    type: 'varchar',
    length: 20,
    default: 'release',
  })
  signatureType: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
