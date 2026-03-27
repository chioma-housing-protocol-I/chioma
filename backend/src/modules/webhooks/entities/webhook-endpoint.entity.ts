import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WebhookDelivery } from './webhook-delivery.entity';
import { WebhookEvent } from '../webhook-event';

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'simple-array', default: '' })
  events: WebhookEvent[];

  @Column({ type: 'text', nullable: true })
  secret?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => WebhookDelivery, (delivery) => delivery.endpoint)
  deliveries: WebhookDelivery[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
