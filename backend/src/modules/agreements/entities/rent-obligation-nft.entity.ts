import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('rent_obligation_nfts')
@Index(['agreementId'], { unique: true })
@Index(['currentOwner'])
@Index(['originalLandlord'])
export class RentObligationNft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agreement_id', unique: true })
  agreementId: string;

  @Column({ name: 'obligation_id' })
  obligationId: string;

  @Column({ name: 'current_owner' })
  currentOwner: string;

  @Column({ name: 'original_landlord' })
  originalLandlord: string;

  @Column({ name: 'mint_tx_hash' })
  mintTxHash: string;

  @Column({ name: 'last_transfer_tx_hash', nullable: true })
  lastTransferTxHash?: string;

  @Column({ name: 'minted_at', type: 'timestamp' })
  mintedAt: Date;

  @Column({ name: 'last_transferred_at', type: 'timestamp', nullable: true })
  lastTransferredAt?: Date;

  @Column({ name: 'transfer_count', default: 0 })
  transferCount: number;

  @Column({ name: 'status', default: 'active' })
  status: 'active' | 'burned' | 'disputed';

  @Column({ name: 'metadata_uri', nullable: true })
  metadataUri?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
