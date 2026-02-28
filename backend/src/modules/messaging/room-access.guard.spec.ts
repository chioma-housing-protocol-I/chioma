import { Test, TestingModule } from '@nestjs/testing';
import { RoomAccessGuard } from './room-access.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Participant } from './entities/participant.entity';
import { ChatRoom } from './entities/chat-room.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
});

describe('RoomAccessGuard', () => {
  let guard: RoomAccessGuard;
  let participantRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomAccessGuard,
        { provide: getRepositoryToken(Participant), useFactory: mockRepo },
        { provide: getRepositoryToken(ChatRoom), useFactory: mockRepo },
      ],
    }).compile();

    guard = module.get<RoomAccessGuard>(RoomAccessGuard);
    participantRepo = module.get(getRepositoryToken(Participant));
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if participant exists', async () => {
    participantRepo.findOne.mockResolvedValue({ id: 1 });
    const context: any = {
      switchToWs: () => ({
        getClient: () => ({
          handshake: { query: { chatGroupId: 'group', userId: 1 } },
        }),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access if participant does not exist', async () => {
    participantRepo.findOne.mockResolvedValue(undefined);
    const context: any = {
      switchToWs: () => ({
        getClient: () => ({
          handshake: { query: { chatGroupId: 'group', userId: 2 } },
        }),
      }),
    };
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });
});
