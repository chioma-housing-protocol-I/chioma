import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, MoreThan } from 'typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';
import { MessageRead } from './entities/message-read.entity';
import { v4 as uuid } from 'uuid';
import { PaginationUtils } from '../../common/utils';
import { UnreadCountResponseDto } from './dto/unread-count-response.dto';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(MessageRead)
    private messageReadRepository: Repository<MessageRead>,
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

  async markRoomAsRead(roomId: string, userId: string): Promise<void> {
    const roomIdNum = parseInt(roomId, 10);
    const userIdNum = parseInt(userId, 10);

    // Verify room exists and user is a participant
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomIdNum },
      relations: ['participants'],
    });

    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const isParticipant = room.participants.some((p) => p.userId === userIdNum);
    if (!isParticipant) {
      throw new Error(`User ${userId} is not a participant in room ${roomId}`);
    }

    // Get the latest message timestamp in this room
    const latestMessage = await this.messageRepository.findOne({
      where: { chatRoom: { id: roomIdNum } },
      order: { timestamp: 'DESC' },
    });

    // If no messages exist, there's nothing to mark as read
    if (!latestMessage) {
      return;
    }

    // Upsert the read receipt
    const existingReceipt = await this.messageReadRepository.findOne({
      where: {
        userId: userIdNum,
        chatRoomId: roomIdNum,
      },
    });

    if (existingReceipt) {
      existingReceipt.readAt = latestMessage.timestamp;
      existingReceipt.updatedAt = new Date();
      await this.messageReadRepository.save(existingReceipt);
    } else {
      const receipt = this.messageReadRepository.create({
        userId: userIdNum,
        chatRoomId: roomIdNum,
        readAt: latestMessage.timestamp,
      });
      await this.messageReadRepository.save(receipt);
    }
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const userIdNum = parseInt(userId, 10);

    // Get all rooms the user is part of
    const rooms = await this.chatRoomRepository
      .createQueryBuilder('room')
      .innerJoin('room.participants', 'p', 'p.userId = :userId', {
        userId: userIdNum,
      })
      .getMany();

    const roomUnreadCounts = await Promise.all(
      rooms.map(async (room) => {
        // Get the read receipt for this room
        const receipt = await this.messageReadRepository.findOne({
          where: {
            userId: userIdNum,
            chatRoomId: room.id,
          },
        });

        let unreadCount = 0;

        if (receipt) {
          // Count messages newer than the read receipt
          unreadCount = await this.messageRepository.count({
            where: {
              chatRoom: { id: room.id },
              timestamp: MoreThan(receipt.readAt),
            },
          });
        } else {
          // No receipt means all messages are unread
          unreadCount = await this.messageRepository.count({
            where: {
              chatRoom: { id: room.id },
            },
          });
        }

        return {
          roomId: room.id,
          chatGroupId: room.chatGroupId,
          unreadCount,
        };
      }),
    );

    const totalUnread = roomUnreadCounts.reduce(
      (sum, room) => sum + room.unreadCount,
      0,
    );

    return {
      totalUnread,
      rooms: roomUnreadCounts,
    };
  }
}
