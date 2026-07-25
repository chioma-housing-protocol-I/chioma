import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { SessionCleanupService } from './session-cleanup.service';
import { Repository } from 'typeorm';

describe('SessionCleanupService', () => {
  let service: SessionCleanupService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockUserRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCleanupService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<SessionCleanupService>(SessionCleanupService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call update on userRepository for reset tokens and account locks', async () => {
    await service.handleCron();

    expect(userRepository.update).toHaveBeenCalledTimes(2);
    expect(userRepository.update).toHaveBeenNthCalledWith(
      1,
      { resetTokenExpires: expect.anything() },
      { resetToken: null, resetTokenExpires: null },
    );
    expect(userRepository.update).toHaveBeenNthCalledWith(
      2,
      { accountLockedUntil: expect.anything() },
      { accountLockedUntil: null, failedLoginAttempts: 0 },
    );
  });
});
