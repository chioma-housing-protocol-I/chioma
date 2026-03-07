import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Arbiter } from './arbiter.entity';

export enum DisputeOutcome {
  FAVOR_LANDLORD = 'FavorLandlord',
  FAVOR_TENANT = 'FavorTenant',
}

@Entity()
export class DisputeVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  disputeId: string;

  @Column()
  arbiterAddress: string;

  @Column()
  vote: boolean; // true for landlord, false for tenant

  @Column({ nullable: true })
  evidence: string;

  @Column({ nullable: true })
  reasoning: string;

  @CreateDateColumn()
  votedAt: Date;

  @Column()
  transactionHash: string;

  @ManyToOne(() => Arbiter, arbiter => arbiter.votes)
  @JoinColumn({ name: 'arbiterAddress', referencedColumnName: 'address' })
  arbiter: Arbiter;

  @ManyToOne(() => 'Dispute', dispute => dispute.votes)
  dispute: 'Dispute';
}
