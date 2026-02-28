import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
  ) {}

  async saveMessage(data: any): Promise<Message> {
    if (Array.isArray(data)) {
      throw new Error(
        'saveMessage expects a single message object, not an array',
      );
    }
    const message = this.messageRepository.create(data);
    return this.messageRepository.save(message) as unknown as Promise<Message>;
  }

  async getHistory(
    chatGroupId: string,
    page = 1,
    limit = 20,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatRoom: { chatGroupId } },
      order: { timestamp: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender', 'receiver'],
    });
  }
}
