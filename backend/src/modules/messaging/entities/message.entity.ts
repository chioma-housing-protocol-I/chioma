import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { Participant } from './participant.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: number;

  @Column()
  receiverId: number;

  @Column('text')
  content: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages)
  chatRoom: ChatRoom;

  @ManyToOne(() => Participant, (participant) => participant.messages)
  sender: Participant;

  @ManyToOne(() => Participant, (participant) => participant.messages)
  receiver: Participant;
}
