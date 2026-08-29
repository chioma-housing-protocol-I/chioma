import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SearchFilters } from '../search.service';

@Entity('saved_searches')
@Index('idx_saved_searches_user_id', ['userId'])
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'jsonb' })
  filters: SearchFilters;

  @Column({ type: 'boolean', default: true })
  alertsEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastNotifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
