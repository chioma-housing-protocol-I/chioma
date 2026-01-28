import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { StellarAuthService } from '../services/stellar-auth.service';
import { User, AuthMethod } from '../../users/entities/user.entity';

describe('StellarAuthService', () => {
  let service: StellarAuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockWalletAddress = 'GBTT5LIQ7BOBRY4GNJGY37GKPYRPTXVM6NGWDN3NGLGH2EKFO7JU57ZC';

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'STELLAR_SERVER_SECRET_KEY':
          return 'SBYYY3IL3A2RFQCUINOZLGV3S4BCMCEB4TGMRL7G5KMT2Q4AOTEEUGDJ';
        case 'STELLAR_NETWORK':
          return 'testnet';
        default:
          return 'test-secret-key';
      }
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StellarAuthService>(StellarAuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    mockConfigService.get.mockReturnValue('test-secret-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyStellarAddress', () => {
    it('should return true for valid Stellar address', () => {
      const validAddress = 'GD5D2B2A2KHWGFP2GBM4D7J23G5Q2Y6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q2QAA';
      expect(service.verifyStellarAddress(validAddress)).toBe(true);
    });

    it('should return false for invalid Stellar address', () => {
      expect(service.verifyStellarAddress('invalid')).toBe(false);
      expect(service.verifyStellarAddress('')).toBe(false);
      expect(service.verifyStellarAddress('GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q')).toBe(false); // Too short
    });
  });

  describe('generateChallenge', () => {
    it('should throw BadRequestException for invalid address', async () => {
      await expect(service.generateChallenge('invalid')).rejects.toThrow(BadRequestException);
    });

    it('should generate challenge for valid address', async () => {
      // Mock the Stellar SDK methods to avoid actual network calls
      const { Keypair } = require('@stellar/stellar-sdk');
      const mockKeypair = Keypair.fromSecret('SBYYY3IL3A2RFQCUINOZLGV3S4BCMCEB4TGMRL7G5KMT2Q4AOTEEUGDJ');
      
      const mockAccount = {
        accountId: () => mockKeypair.publicKey(),
        sequenceNumber: () => '1',
        incrementSequenceNumber: () => {},
      };
      
      jest.spyOn(service as any, 'getServerKeypair').mockReturnValue(mockKeypair);
      jest.spyOn(service as any, 'getServerAccount').mockResolvedValue(mockAccount);
      
      const result = await service.generateChallenge(mockWalletAddress);
      
      expect(result).toHaveProperty('challenge');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.challenge).toBe('string');
      expect(typeof result.expiresAt).toBe('string');
    });
  });

  describe('verifySignature', () => {
    it('should throw BadRequestException for invalid address', async () => {
      const verifyDto = {
        walletAddress: 'invalid',
        signature: 'test-signature',
        challenge: 'test-challenge',
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(BadRequestException);
    });

    it('should create new user if not exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        walletAddress: mockWalletAddress,
        authMethod: AuthMethod.STELLAR,
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'user-id',
        walletAddress: mockWalletAddress,
        authMethod: AuthMethod.STELLAR,
        role: 'user',
      });
      mockJwtService.sign.mockReturnValue('test-token');

      // Mock the challenge storage and verification
      jest.spyOn(service as any, 'verifyChallengeSignature').mockResolvedValue(true);
      
      // Manually store a challenge for testing
      const challengeXdr = 'mock-challenge-xdr';
      const challengeId = require('crypto').createHash('sha256').update(challengeXdr).digest('hex');
      (service as any).challenges.set(challengeId, {
        walletAddress: mockWalletAddress,
        challenge: challengeXdr,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        nonce: 'test-nonce',
      });
      
      const verifyDto = {
        walletAddress: mockWalletAddress,
        signature: 'test-signature',
        challenge: challengeXdr,
      };

      const result = await service.verifySignature(verifyDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        walletAddress: mockWalletAddress,
        authMethod: AuthMethod.STELLAR,
        emailVerified: true,
        failedLoginAttempts: 0,
        isActive: true,
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should update existing user', async () => {
      const existingUser = {
        id: 'user-id',
        walletAddress: mockWalletAddress,
        authMethod: AuthMethod.PASSWORD,
        role: 'user',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        authMethod: AuthMethod.STELLAR,
        lastLoginAt: new Date(),
      });
      mockJwtService.sign.mockReturnValue('test-token');

      jest.spyOn(service as any, 'verifyChallengeSignature').mockResolvedValue(true);
      
      // Manually store a challenge for testing
      const challengeXdr = 'mock-challenge-xdr';
      const challengeId = require('crypto').createHash('sha256').update(challengeXdr).digest('hex');
      (service as any).challenges.set(challengeId, {
        walletAddress: mockWalletAddress,
        challenge: challengeXdr,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        nonce: 'test-nonce',
      });

      const verifyDto = {
        walletAddress: mockWalletAddress,
        signature: 'test-signature',
        challenge: challengeXdr,
      };

      const result = await service.verifySignature(verifyDto);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          authMethod: AuthMethod.STELLAR,
          lastLoginAt: expect.any(Date),
        })
      );
      expect(result).toHaveProperty('user');
    });
  });
});
