import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisputeVote } from './dispute-vote.entity';

@Entity()
export class Arbiter {
  @PrimaryColumn()
  address: string;

  @Column()
  qualifications: string;

  @Column({ nullable: true })
  specialization: string;

  @Column()
  stakeAmount: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  reputationScore: number;

  @Column({ default: 0 })
  totalDisputes: number;

  @Column({ default: 0 })
  successfulResolutions: number;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;

  @OneToMany(() => DisputeVote, vote => vote.arbiter)
  votes: DisputeVote[];
}
