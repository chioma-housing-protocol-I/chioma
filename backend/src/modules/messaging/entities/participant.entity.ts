import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { Message } from './message.entity';

@Entity()
export class Participant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.participants)
  chatRoom: ChatRoom;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];
}
