import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('supported_currencies')
export class SupportedCurrency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 10 })
  code: string;

  @Column()
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'anchor_url' })
  anchorUrl: string;

  @Column({ name: 'stellar_asset_code', nullable: true })
  stellarAssetCode: string;

  @Column({ name: 'stellar_asset_issuer', nullable: true })
  stellarAssetIssuer: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
