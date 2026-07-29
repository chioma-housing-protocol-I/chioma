import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';
import { v4 as uuid } from 'uuid';

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

  // ── Legacy ───────────────────────────────────────────────────────────────

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

  // ── Rooms ─────────────────────────────────────────────────────────────────

  async getRoomsForUser(userId: string): Promise<ChatRoom[]> {
    return this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.participants', 'p', 'p.userId = :userId', { userId })
      .leftJoinAndSelect('room.participants', 'participants')
      .leftJoinAndSelect('room.messages', 'messages')
      .orderBy('room.id', 'DESC')
      .getMany();
  }

  async findOrCreateRoom(
    userId: string,
    participantId: string,
  ): Promise<ChatRoom> {
    // Look for an existing DM room between these two users
    const existing = await this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.participants', 'p1', 'p1.userId = :userId', { userId })
      .innerJoin('room.participants', 'p2', 'p2.userId = :participantId', {
        participantId,
      })
      .leftJoinAndSelect('room.participants', 'participants')
      .getOne();

    if (existing) return existing;

    // Create new room
    const room = this.chatRoomRepository.create({ chatGroupId: uuid() });
    const savedRoom = await this.chatRoomRepository.save(room);

    const p1 = this.participantRepository.create({
      userId: parseInt(userId, 10),
      chatRoom: savedRoom,
    });
    const p2 = this.participantRepository.create({
      userId: parseInt(participantId, 10),
      chatRoom: savedRoom,
    });
    await this.participantRepository.save([p1, p2]);

    return this.chatRoomRepository.findOne({
      where: { id: savedRoom.id },
      relations: ['participants'],
    }) as Promise<ChatRoom>;
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessagesForRoom(
    roomId: string,
    page = 1,
    limit = 50,
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: { chatRoom: { id: parseInt(roomId, 10) } },
      order: { timestamp: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender'],
    });
  }

  async markRoomAsRead(_roomId: string, _userId: string): Promise<void> {
    // Mark messages in this room as read for the given user
    // This is a best-effort operation — no readAt column exists yet
    // so we just return without error for now
    return;
  }
}
