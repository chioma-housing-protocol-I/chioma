import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';
import { MessageRead } from './entities/message-read.entity';

describe('MessagingService - Read Receipts', () => {
  let service: MessagingService;
  let messageRepository: Repository<Message>;
  let chatRoomRepository: Repository<ChatRoom>;
  let participantRepository: Repository<Participant>;
  let messageReadRepository: Repository<MessageRead>;

  const mockMessageRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockChatRoomRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockParticipantRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMessageReadRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(ChatRoom),
          useValue: mockChatRoomRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: mockParticipantRepository,
        },
        {
          provide: getRepositoryToken(MessageRead),
          useValue: mockMessageReadRepository,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    messageRepository = module.get(getRepositoryToken(Message));
    chatRoomRepository = module.get(getRepositoryToken(ChatRoom));
    participantRepository = module.get(getRepositoryToken(Participant));
    messageReadRepository = module.get(getRepositoryToken(MessageRead));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markRoomAsRead', () => {
    it('should create a new read receipt if none exists', async () => {
      const roomId = '1';
      const userId = '100';
      const latestMessageTimestamp = new Date('2026-01-01T12:00:00Z');

      const mockRoom = {
        id: 1,
        chatGroupId: 'room-uuid',
        participants: [{ id: 1, userId: 100 }],
      };

      const mockLatestMessage = {
        id: 5,
        timestamp: latestMessageTimestamp,
      };

      mockChatRoomRepository.findOne.mockResolvedValue(mockRoom);
      mockMessageRepository.findOne.mockResolvedValue(mockLatestMessage);
      mockMessageReadRepository.findOne.mockResolvedValue(null);
      mockMessageReadRepository.create.mockReturnValue({
        userId: 100,
        chatRoomId: 1,
        readAt: latestMessageTimestamp,
      });
      mockMessageReadRepository.save.mockResolvedValue({});

      await service.markRoomAsRead(roomId, userId);

      expect(mockChatRoomRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['participants'],
      });
      expect(mockMessageRepository.findOne).toHaveBeenCalledWith({
        where: { chatRoom: { id: 1 } },
        order: { timestamp: 'DESC' },
      });
      expect(mockMessageReadRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 100, chatRoomId: 1 },
      });
      expect(mockMessageReadRepository.create).toHaveBeenCalledWith({
        userId: 100,
        chatRoomId: 1,
        readAt: latestMessageTimestamp,
      });
      expect(mockMessageReadRepository.save).toHaveBeenCalled();
    });

    it('should update existing read receipt', async () => {
      const roomId = '1';
      const userId = '100';
      const oldTimestamp = new Date('2026-01-01T10:00:00Z');
      const newTimestamp = new Date('2026-01-01T12:00:00Z');

      const mockRoom = {
        id: 1,
        participants: [{ userId: 100 }],
      };

      const mockLatestMessage = {
        timestamp: newTimestamp,
      };

      const mockExistingReceipt = {
        id: 1,
        userId: 100,
        chatRoomId: 1,
        readAt: oldTimestamp,
        updatedAt: oldTimestamp,
      };

      mockChatRoomRepository.findOne.mockResolvedValue(mockRoom);
      mockMessageRepository.findOne.mockResolvedValue(mockLatestMessage);
      mockMessageReadRepository.findOne.mockResolvedValue(mockExistingReceipt);
      mockMessageReadRepository.save.mockResolvedValue({});

      await service.markRoomAsRead(roomId, userId);

      expect(mockExistingReceipt.readAt).toEqual(newTimestamp);
      expect(mockMessageReadRepository.save).toHaveBeenCalledWith(
        mockExistingReceipt,
      );
    });

    it('should throw error if room does not exist', async () => {
      mockChatRoomRepository.findOne.mockResolvedValue(null);

      await expect(service.markRoomAsRead('999', '100')).rejects.toThrow(
        'Room 999 not found',
      );
    });

    it('should throw error if user is not a participant', async () => {
      const mockRoom = {
        id: 1,
        participants: [{ userId: 200 }],
      };

      mockChatRoomRepository.findOne.mockResolvedValue(mockRoom);

      await expect(service.markRoomAsRead('1', '100')).rejects.toThrow(
        'User 100 is not a participant in room 1',
      );
    });

    it('should return early if room has no messages', async () => {
      const mockRoom = {
        id: 1,
        participants: [{ userId: 100 }],
      };

      mockChatRoomRepository.findOne.mockResolvedValue(mockRoom);
      mockMessageRepository.findOne.mockResolvedValue(null);

      await service.markRoomAsRead('1', '100');

      expect(mockMessageReadRepository.findOne).not.toHaveBeenCalled();
      expect(mockMessageReadRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('should return accurate unread counts per room', async () => {
      const userId = '100';

      const mockRooms = [
        { id: 1, chatGroupId: 'room-1' },
        { id: 2, chatGroupId: 'room-2' },
      ];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockRooms),
      };

      mockChatRoomRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Room 1: has read receipt, 3 new messages
      mockMessageReadRepository.findOne
        .mockResolvedValueOnce({
          userId: 100,
          chatRoomId: 1,
          readAt: new Date('2026-01-01T10:00:00Z'),
        })
        .mockResolvedValueOnce(null); // Room 2: no receipt

      mockMessageRepository.count
        .mockResolvedValueOnce(3) // Room 1 unread
        .mockResolvedValueOnce(7); // Room 2 all unread

      const result = await service.getUnreadCount(userId);

      expect(result.totalUnread).toBe(10);
      expect(result.rooms).toHaveLength(2);
      expect(result.rooms[0]).toEqual({
        roomId: 1,
        chatGroupId: 'room-1',
        unreadCount: 3,
      });
      expect(result.rooms[1]).toEqual({
        roomId: 2,
        chatGroupId: 'room-2',
        unreadCount: 7,
      });
    });

    it('should return zero unread when user has no rooms', async () => {
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockChatRoomRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getUnreadCount('100');

      expect(result.totalUnread).toBe(0);
      expect(result.rooms).toHaveLength(0);
    });

    it('should handle rooms with zero unread messages', async () => {
      const mockRooms = [{ id: 1, chatGroupId: 'room-1' }];

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockRooms),
      };

      mockChatRoomRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockMessageReadRepository.findOne.mockResolvedValue({
        userId: 100,
        chatRoomId: 1,
        readAt: new Date('2026-01-01T12:00:00Z'),
      });

      mockMessageRepository.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('100');

      expect(result.totalUnread).toBe(0);
      expect(result.rooms[0].unreadCount).toBe(0);
    });
  });
});
