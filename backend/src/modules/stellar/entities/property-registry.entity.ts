import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('property_registry')
@Index('IDX_property_registry_owner', ['ownerAddress'])
@Index('IDX_property_registry_verified', ['verified'])
export class PropertyRegistry {
  @PrimaryColumn({ name: 'property_id', length: 128 })
  propertyId: string;

  @Column({ name: 'owner_address', length: 56 })
  ownerAddress: string;

  @Column({ name: 'metadata_hash', length: 256 })
  metadataHash: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'verified_at', nullable: true, type: 'timestamp' })
  verifiedAt: Date | null;

  @Column({ name: 'verified_by', length: 56, nullable: true })
  verifiedBy: string | null;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('property_history')
@Index('IDX_property_history_property_id', ['propertyId'])
@Index('IDX_property_history_from_address', ['fromAddress'])
@Index('IDX_property_history_to_address', ['toAddress'])
export class PropertyHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'property_id', length: 128 })
  propertyId: string;

  @Column({ name: 'from_address', length: 56 })
  fromAddress: string;

  @Column({ name: 'to_address', length: 56 })
  toAddress: string;

  @Column({ name: 'transaction_hash', length: 64 })
  transactionHash: string;

  @CreateDateColumn({ name: 'transferred_at' })
  transferredAt: Date;
}
