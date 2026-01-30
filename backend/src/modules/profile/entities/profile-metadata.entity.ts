import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('profile_metadata')
@Index('idx_profile_metadata_user_id', ['userId'], { unique: true })
@Index('idx_profile_metadata_wallet_address', ['walletAddress'], {
  unique: true,
})
export class ProfileMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'wallet_address', type: 'varchar', length: 56, unique: true })
  walletAddress: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'data_hash', type: 'varchar', length: 64 })
  dataHash: string;

  @Column({ name: 'ipfs_cid', type: 'varchar', length: 100, nullable: true })
  ipfsCid: string | null;

  @Column({ name: 'last_synced_at', type: 'timestamp' })
  lastSyncedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
