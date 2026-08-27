import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('host_reviews')
@Index(['bookingId', 'guestId'], { unique: true })
@Index(['guestId'])
@Index(['hostId'])
export class HostReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'varchar' })
  bookingId: string;

  @Column({ name: 'guest_id', type: 'varchar' })
  guestId: string;

  @Column({ name: 'host_id', type: 'varchar' })
  hostId: string;

  @Column({ type: 'int', default: 5 })
  accuracy: number;

  @Column({ type: 'int', default: 5 })
  cleanliness: number;

  @Column({ name: 'check_in', type: 'int', default: 5 })
  checkIn: number;

  @Column({ type: 'int', default: 5 })
  communication: number;

  @Column({ type: 'int', default: 5 })
  location: number;

  @Column({ type: 'int', default: 5 })
  value: number;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
