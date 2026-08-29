import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { Participant } from './entities/participant.entity';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

describe('MessagingService', () => {
  let service: MessagingService;
  let messageRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: getRepositoryToken(Message), useFactory: mockRepo },
        { provide: getRepositoryToken(ChatRoom), useFactory: mockRepo },
        { provide: getRepositoryToken(Participant), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    messageRepo = module.get(getRepositoryToken(Message));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save a message', async () => {
    const data = { content: 'test' };
    messageRepo.create.mockReturnValue(data);
    messageRepo.save.mockResolvedValue(data);
    const result = await service.saveMessage(data);
    expect(result).toEqual(data);
  });

  it('should get history', async () => {
    const messages = [{ content: 'msg1' }, { content: 'msg2' }];
    messageRepo.find.mockResolvedValue(messages);
    const result = await service.getHistory('group1', 1, 2);
    expect(result).toEqual(messages);
  });

  describe('sendDirectMessage', () => {
    it('bridges two users into a room and posts a message', async () => {
      const room = {
        id: 7,
        participants: [{ userId: 1 }, { userId: 2 }],
      };
      jest.spyOn(service, 'findOrCreateRoom').mockResolvedValue(room as any);
      messageRepo.create.mockImplementation((input) => input);
      messageRepo.save.mockImplementation(async (input) => ({
        id: 99,
        ...input,
      }));

      const result = await service.sendDirectMessage('1', '2', 'hi there');

      expect(service.findOrCreateRoom).toHaveBeenCalledWith('1', '2');
      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          senderId: 1,
          receiverId: 2,
          content: 'hi there',
          chatRoom: room,
          sender: { userId: 1 },
          receiver: { userId: 2 },
        }),
      );
      expect(result.room).toBe(room);
      expect(result.message.id).toBe(99);
    });
  });
});
