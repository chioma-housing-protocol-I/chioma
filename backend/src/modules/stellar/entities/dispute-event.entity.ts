import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum DisputeEventType {
  DISPUTE_RAISED = 'dispute_raised',
  ARBITERS_SELECTED = 'arbiters_selected',
  VOTE_CAST = 'vote_cast',
  VOTING_COMPLETE = 'voting_complete',
  RESOLUTION_ENFORCED = 'resolution_enforced',
  APPEAL_FILED = 'appeal_filed',
}

@Entity()
export class DisputeEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  disputeId: string;

  @Column({
    type: 'enum',
    enum: DisputeEventType,
  })
  eventType: DisputeEventType;

  @Column('text')
  eventData: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  triggeredBy: string;
}
