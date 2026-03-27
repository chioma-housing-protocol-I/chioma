import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class PropertyRegistry {
  @PrimaryColumn()
  propertyId: string;

  @Column()
  ownerAddress: string;

  @Column()
  metadataHash: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  verifiedAt: Date;

  @Column({ nullable: true })
  verifiedBy: string;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity()
export class PropertyHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  propertyId: string;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column()
  transactionHash: string;

  @CreateDateColumn()
  transferredAt: Date;
}
