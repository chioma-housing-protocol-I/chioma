import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RentAgreement } from './rent-agreement.entity';
import { NFTMetadata } from '../../stellar/dto/rent-obligation-nft.dto';

@Entity('rent_obligation_nfts')
export class RentObligationNft {
  @PrimaryColumn()
  tokenId: string;

  @Column()
  agreementId: string;

  @Column({ name: 'current_owner' })
  currentOwner: string;

  @Column({ name: 'original_owner' })
  originalOwner: string;

  @Column('jsonb')
  metadata: NFTMetadata;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  mintedAt: Date;

  @Column({ nullable: true })
  mintTransactionHash: string;

  @Column({ nullable: true })
  burnedAt: Date;

  @Column({ nullable: true })
  burnTransactionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => RentAgreement)
  @JoinColumn({ name: 'agreementId' })
  agreement: RentAgreement;

  @OneToMany(() => NFTTransfer, (transfer) => transfer.nft)
  transfers: NFTTransfer[];
}

@Entity('nft_transfers')
export class NFTTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tokenId: string;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column()
  transactionHash: string;

  @Column()
  transferredAt: Date;

  @ManyToOne(() => RentObligationNft, (nft) => nft.transfers)
  @JoinColumn({ name: 'tokenId' })
  nft: RentObligationNft;
}
