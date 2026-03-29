import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Property } from './property.entity';

export enum TourEventType {
  VIEW_START = 'view_start',
  VIEW_END = 'view_end',
  INTERACT = 'interact',
}

@Entity('property_tour_engagements')
export class PropertyTourEngagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'session_id', type: 'varchar', nullable: true })
  sessionId?: string | null;

  @Column({ name: 'provider', type: 'varchar', nullable: true })
  provider?: string | null;

  @Column({ name: 'event_type', type: 'varchar' })
  eventType: TourEventType;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds?: number | null;

  @Column({ name: 'device_type', type: 'varchar', nullable: true })
  deviceType?: string | null;

  @Column({ name: 'source', type: 'varchar', nullable: true })
  source?: string | null;

  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
