import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WebhookEndpoint } from './webhook-endpoint.entity';
import { WebhookEvent } from '../webhook-event';

@Entity('webhook_deliveries')
@Index(['endpointId', 'createdAt'])
@Index(['endpointId', 'successful'])
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

  /**
   * Total number of delivery attempts made for this event, including the
   * initial attempt. Incremented on each retry so the subscriber can see
   * exactly how many times delivery was tried.
   */
  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  /**
   * Wall-clock time of the most recent delivery attempt. Null until the
   * first attempt completes (success or failure).
   */
  @Column({ name: 'last_attempt_at', type: 'timestamp', nullable: true })
  lastAttemptAt?: Date | null;

  /**
   * Scheduled time of the next automatic retry. Null when the delivery
   * succeeded or when all retry attempts have been exhausted.
   */
  @Column({ name: 'next_retry_at', type: 'timestamp', nullable: true })
  nextRetryAt?: Date | null;

  /**
   * True once all automatic retry attempts have been exhausted without a
   * successful delivery. The subscriber can still trigger a manual retry via
   * POST /developer/webhooks/:id/retry.
   */
  @Column({ name: 'exhausted', type: 'boolean', default: false })
  exhausted: boolean;

  /**
   * Short error code summarising why the last attempt failed, e.g.
   * "HTTP_503", "TIMEOUT", "NETWORK_ERROR". Null on success.
   */
  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true })
  errorCode?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;
}
