import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';
import { v4 as uuid } from 'uuid';
import { PaginationUtils } from '../../common/utils';

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

  async getRoomsForUser(userId: string, page = 1, limit = 20) {
    PaginationUtils.validatePagination(page, limit);

    // Resolve the paginated room ids first via a join-free query, then load
    // full relations for just that page — a direct skip/take on a query with
    // a one-to-many `messages` join would paginate joined rows, not rooms.
    const membershipQuery = this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.participants', 'p', 'p.userId = :userId', { userId });

    const total = await membershipQuery.getCount();

    const idRows = await membershipQuery
      .clone()
      .select('room.id', 'id')
      .orderBy('room.id', 'DESC')
      .skip(PaginationUtils.calculateOffset(page, limit))
      .take(limit)
      .getRawMany<{ id: number }>();
    const roomIds = idRows.map((r) => r.id);

    const data = roomIds.length
      ? await this.chatRoomRepository.find({
          where: { id: In(roomIds) },
          relations: ['participants', 'messages'],
          order: { id: 'DESC' },
        })
      : [];

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
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

  /**
   * Bridge helper for other modules (e.g. inquiries): ensure a DM room exists
   * between two users and post a message from `senderUserId` into it. Returns
   * the room and the persisted message so callers can link the two parties'
   * conversation into the in-app messaging system instead of pushing them to
   * reply off-platform.
   */
  async sendDirectMessage(
    senderUserId: string,
    recipientUserId: string,
    content: string,
  ): Promise<{ room: ChatRoom; message: Message }> {
    const room = await this.findOrCreateRoom(senderUserId, recipientUserId);

    const senderNumericId = parseInt(senderUserId, 10);
    const recipientNumericId = parseInt(recipientUserId, 10);

    const message = this.messageRepository.create({
      senderId: senderNumericId,
      receiverId: recipientNumericId,
      content,
      chatRoom: room,
      sender: room.participants?.find((p) => p.userId === senderNumericId),
      receiver: room.participants?.find((p) => p.userId === recipientNumericId),
    });

    const saved = await this.messageRepository.save(message);
    return { room, message: saved };
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessagesForRoom(roomId: string, page = 1, limit = 50) {
    PaginationUtils.validatePagination(page, limit);

    const [data, total] = await this.messageRepository.findAndCount({
      where: { chatRoom: { id: parseInt(roomId, 10) } },
      order: { timestamp: 'ASC' },
      skip: PaginationUtils.calculateOffset(page, limit),
      take: limit,
      relations: ['sender'],
    });

    return PaginationUtils.buildPaginationResponse(data, total, page, limit);
  }

  async markRoomAsRead(_roomId: string, _userId: string): Promise<void> {
    // Mark messages in this room as read for the given user
    // This is a best-effort operation — no readAt column exists yet
    // so we just return without error for now
    return;
  }
}
