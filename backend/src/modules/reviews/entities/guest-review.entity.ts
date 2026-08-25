import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('guest_reviews')
@Index(['bookingId', 'hostId'], { unique: true })
@Index(['guestId'])
@Index(['hostId'])
export class GuestReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'varchar' })
  bookingId: string;

  @Column({ name: 'guest_id', type: 'varchar' })
  guestId: string;

  @Column({ name: 'host_id', type: 'varchar' })
  hostId: string;

  @Column({ type: 'int', default: 5 })
  cleanliness: number;

  @Column({ type: 'int', default: 5 })
  communication: number;

  @Column({ name: 'respect_for_rules', type: 'int', default: 5 })
  respectForRules: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ name: 'would_host_again', type: 'boolean', default: false })
  wouldHostAgain: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
