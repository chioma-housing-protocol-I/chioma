import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum DisputeEventType {
  DISPUTE_RAISED = 'dispute_raised',
  ARBITERS_SELECTED = 'arbiters_selected',
  VOTE_CAST = 'vote_cast',
  VOTING_COMPLETE = 'voting_complete',
  RESOLUTION_ENFORCED = 'resolution_enforced',
  APPEAL_FILED = 'appeal_filed',
  APPEAL_RESOLVED = 'appeal_resolved',
  TIMEOUT_TRIGGERED = 'timeout_triggered',
}

@Entity('dispute_events')
@Index('IDX_dispute_events_dispute_id', ['disputeId'])
@Index('IDX_dispute_events_event_type', ['eventType'])
@Index('IDX_dispute_events_timestamp', ['timestamp'])
export class DisputeEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dispute_id', type: 'varchar', length: 100 })
  disputeId: string;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 50,
  })
  eventType: DisputeEventType;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData: Record<string, any>;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({
    name: 'triggered_by',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  triggeredBy: string | null;

  @Column({
    name: 'transaction_hash',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
