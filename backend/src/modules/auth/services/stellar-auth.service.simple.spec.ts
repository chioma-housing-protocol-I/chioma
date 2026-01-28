import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StellarAuthService } from './stellar-auth.service';
import { User, AuthMethod } from '../../users/entities/user.entity';
import { StellarAuthVerifyDto } from '../dto/stellar-auth.dto';

describe('StellarAuthService', () => {
  let service: StellarAuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockWalletAddress = 'GBTT5LIQ7BOBRY4GNJGY37GKPYRPTXVM6NGWDN3NGLGH2EKFO7JU57ZC';

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

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

    mockConfigService.get.mockReturnValue('test-secret-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyStellarAddress', () => {
    it('should return true for valid Stellar address', () => {
      expect(service.verifyStellarAddress(mockWalletAddress)).toBe(true);
    });

    it('should return false for invalid Stellar address', () => {
      expect(service.verifyStellarAddress('invalid')).toBe(false);
      expect(service.verifyStellarAddress('')).toBe(false);
      expect(service.verifyStellarAddress('G' + 'A'.repeat(54))).toBe(false); // Invalid chars
    });
  });

  describe('generateChallenge', () => {
    it('should throw BadRequestException for invalid address', async () => {
      await expect(service.generateChallenge('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate challenge for valid address', async () => {
      // Mock the Stellar SDK methods to avoid actual key generation
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
      const verifyDto: StellarAuthVerifyDto = {
        walletAddress: 'invalid',
        signature: 'signature',
        challenge: 'challenge',
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException for missing challenge', async () => {
      const verifyDto: StellarAuthVerifyDto = {
        walletAddress: mockWalletAddress,
        signature: 'signature',
        challenge: 'challenge',
      };

      await expect(service.verifySignature(verifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
