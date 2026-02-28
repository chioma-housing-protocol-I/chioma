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
});
