import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
