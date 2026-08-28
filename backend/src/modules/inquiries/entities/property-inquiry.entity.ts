import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PropertyInquiryStatus {
  PENDING = 'pending',
  VIEWED = 'viewed',
  /** Terminal state: either party ended the conversation. */
  CLOSED = 'closed',
}

@Entity('property_inquiries')
@Index(['propertyId'])
@Index(['toUserId'])
@Index(['fromUserId'])
export class PropertyInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'from_user_id', type: 'uuid' })
  fromUserId: string;

  @Column({ name: 'to_user_id', type: 'uuid' })
  toUserId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  senderName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  senderEmail: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  senderPhone: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: PropertyInquiryStatus.PENDING,
  })
  status: PropertyInquiryStatus;

  @Column({ name: 'viewed_at', type: 'timestamp', nullable: true })
  viewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
