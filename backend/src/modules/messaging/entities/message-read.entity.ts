import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';

/**
 * Tracks read receipts per user per room.
 * When a user marks a room as read, we store the timestamp of the last
 * message they've seen. Any message with timestamp > readAt is unread.
 */
@Entity('message_read')
@Index(['userId', 'chatRoom'], { unique: true })
@Index(['userId'])
export class MessageRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => ChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatRoomId' })
  chatRoom: ChatRoom;

  @Column()
  chatRoomId: number;

  /**
   * The timestamp of the last message the user has read in this room.
   * Messages with timestamp <= readAt are considered read.
   */
  @CreateDateColumn()
  readAt: Date;

  /**
   * Tracks when this read receipt was last updated.
   * Useful for auditing and analytics.
   */
  @CreateDateColumn({ update: true })
  updatedAt: Date;
}
