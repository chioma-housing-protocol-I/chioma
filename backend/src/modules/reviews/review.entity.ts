import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ReviewContext {
  LEASE = 'LEASE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('reviews')
@Index(['reviewerId'])
@Index(['revieweeId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reviewerId: string;

  @Column()
  revieweeId: string;

  @Column({ type: 'enum', enum: ReviewContext })
  context: ReviewContext;

  @Column({ type: 'int', width: 1 })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ default: false })
  anonymous: boolean;

  @Column({ nullable: true })
  propertyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  reported: boolean;
}
