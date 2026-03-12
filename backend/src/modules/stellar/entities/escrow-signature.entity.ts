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

@Entity('stellar_escrow_signatures')
@Index('IDX_escrow_signatures_escrow_id', ['escrowId'])
@Index('IDX_escrow_signatures_signer_address', ['signerAddress'])
@Index('IDX_escrow_signatures_stellar_escrow_id', ['stellarEscrowId'])
export class EscrowSignature {
  @PrimaryGeneratedColumn()
  id: number;

  // On-chain escrow identifier (e.g. Soroban BytesN<32> hex string)
  @Column({ name: 'escrow_id', type: 'varchar', length: 128 })
  escrowId: string;

  @Column({ name: 'stellar_escrow_id', type: 'int', nullable: true })
  stellarEscrowId: number | null;

  @Column({ name: 'signer_address', type: 'varchar', length: 256 })
  signerAddress: string;

  @Column({ type: 'text' })
  signature: string;

  @CreateDateColumn({ name: 'signed_at' })
  signedAt: Date;

  @Column({ name: 'is_valid', type: 'boolean', default: true })
  isValid: boolean;

  @ManyToOne(() => StellarEscrow, (escrow) => escrow.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stellar_escrow_id' })
  escrow: StellarEscrow;
}
