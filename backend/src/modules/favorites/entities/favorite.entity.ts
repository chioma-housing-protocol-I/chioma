import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { FavoriteCollection } from './favorite-collection.entity';

@Entity('favorites')
@Unique('unique_user_property', ['userId', 'propertyId'])
@Index('idx_user_id', ['userId'])
@Index('idx_property_id', ['propertyId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  propertyId: string;

  /** Null means the favorite lives in the user's "Uncategorized" collection. */
  @Column({ type: 'uuid', nullable: true })
  collectionId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => FavoriteCollection, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'collection_id' })
  collection: FavoriteCollection | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'property_id' })
  property: Property;
}
