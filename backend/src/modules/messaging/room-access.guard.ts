import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Participant } from './entities/participant.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RoomAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const { chatGroupId, userId } = client.handshake.query;
    // Check if user is a participant in the chat room
    const participant = await this.participantRepository.findOne({
      where: { userId, chatRoom: { chatGroupId } },
      relations: ['chatRoom'],
    });
    return !!participant;
  }
}
