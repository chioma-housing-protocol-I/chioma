import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { ReviewContext } from '../review.entity';

/**
 * Tracks that a review prompt was already sent for a given lease/maintenance
 * event, so repeated triggers (e.g. re-running a status transition) never
 * re-notify the same parties for the same event.
 */
@Entity('review_prompts')
@Unique(['context', 'sourceId'])
export class ReviewPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  context: ReviewContext;

  @Column()
  sourceId: string;

  @CreateDateColumn()
  promptedAt: Date;
}
