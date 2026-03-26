import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';
import { NFTTransfer } from './nft-transfer.entity';

export interface NFTMetadata {
  agreementId: string;
  propertyAddress: string;
  monthlyRent: string;
  startDate: number;
  endDate: number;
  tenant: string;
  landlord: string;
  agent?: string;
  tokenStandard: string;
  created: number;
}

@Entity('rent_obligation_nfts')
@Index(['agreementId'], { unique: true })
@Index(['currentOwner'])
@Index(['originalOwner'])
export class RentObligationNft {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @PrimaryColumn({ name: 'token_id' })
  tokenId: string;

  @Column({ name: 'agreement_id', unique: true })
  agreementId: string;

  @Column({ name: 'obligation_id' })
  obligationId: string;

  @Column({ name: 'current_owner' })
  currentOwner: string;

  @Column({ name: 'original_owner', nullable: true })
  originalOwner?: string;

  @Column({ name: 'original_landlord', nullable: true })
  originalLandlord?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('json', { name: 'metadata', nullable: true })
  metadata?: NFTMetadata;

  @Column({ name: 'mint_tx_hash', nullable: true })
  mintTxHash: string;

  @Column({ name: 'burn_tx_hash', nullable: true })
  burnTxHash?: string;

  @Column({ name: 'last_transfer_tx_hash', nullable: true })
  lastTransferTxHash?: string;

  @Column({ name: 'minted_at', type: 'timestamp', nullable: true })
  mintedAt?: Date;

  @Column({ name: 'burned_at', type: 'timestamp', nullable: true })
  burnedAt?: Date;

  @Column({ name: 'last_transferred_at', type: 'timestamp', nullable: true })
  lastTransferredAt?: Date;

  @Column({ name: 'transfer_count', default: 0 })
  transferCount: number;

  @Column({ name: 'status', default: 'active' })
  status: 'active' | 'burned' | 'disputed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => RentAgreement, (agreement) => agreement.rentObligationNfts)
  @JoinColumn({ name: 'agreement_id' })
  agreement: RentAgreement;

  @OneToMany(() => NFTTransfer, (transfer) => transfer.nft)
  transfers: NFTTransfer[];
}
