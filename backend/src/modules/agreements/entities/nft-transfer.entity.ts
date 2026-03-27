import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RentObligationNft } from './rent-obligation-nft.entity';

@Entity('nft_transfers')
export class NFTTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'token_id' })
  tokenId: string;

  @Column({ name: 'from_address' })
  fromAddress: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ name: 'transaction_hash', nullable: true })
  transactionHash: string;

  @Column({ name: 'transferred_at', type: 'timestamp' })
  transferredAt: Date;

  @ManyToOne(() => RentObligationNft, (nft) => nft.transfers)
  @JoinColumn({ name: 'token_id', referencedColumnName: 'tokenId' })
  nft: RentObligationNft;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
