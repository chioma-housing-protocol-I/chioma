import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Favorites with a null `collectionId` belong to a virtual "Uncategorized"
 * collection, addressed in the API by this id.
 */
export const UNCATEGORIZED_COLLECTION_ID = 'uncategorized';
export const UNCATEGORIZED_COLLECTION_NAME = 'Uncategorized';

@Entity('favorite_collections')
@Unique('unique_user_collection_name', ['userId', 'name'])
@Index('idx_favorite_collections_user_id', ['userId'])
export class FavoriteCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
