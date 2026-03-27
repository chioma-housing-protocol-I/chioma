import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WebhookEndpoint } from './webhook-endpoint.entity';
import { WebhookEvent } from '../webhook-event';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'endpoint_id', type: 'uuid' })
  endpointId: string;

  @ManyToOne(() => WebhookEndpoint, (endpoint) => endpoint.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endpoint_id' })
  endpoint: WebhookEndpoint;

  @Column({ type: 'varchar' })
  event: WebhookEvent;

  @Column({ type: 'simple-json' })
  payload: Record<string, unknown>;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus?: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody?: string | null;

  @Column({ type: 'boolean', default: false })
  successful: boolean;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;
}
