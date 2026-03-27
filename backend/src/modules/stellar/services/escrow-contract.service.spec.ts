import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EscrowContractService } from './escrow-contract.service';
import { StellarEscrow } from '../entities/stellar-escrow.entity';
import { EscrowSignature } from '../entities/escrow-signature.entity';
import {
  EscrowCondition,
  ConditionType,
} from '../entities/escrow-condition.entity';

describe('EscrowContractService', () => {
  let service: EscrowContractService;
  let _escrowRepository: Repository<StellarEscrow>;
  let _signatureRepository: Repository<EscrowSignature>;
  let _conditionRepository: Repository<EscrowCondition>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        ESCROW_CONTRACT_ID: '', // Empty to skip contract initialization in tests
        STELLAR_ADMIN_SECRET_KEY: '',
        STELLAR_NETWORK: 'testnet',
      };
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
  };

  const mockEscrowRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockSignatureRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockConditionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: mockEscrowRepository,
        },
        {
          provide: getRepositoryToken(EscrowSignature),
          useValue: mockSignatureRepository,
        },
        {
          provide: getRepositoryToken(EscrowCondition),
          useValue: mockConditionRepository,
        },
      ],
    }).compile();

    service = module.get<EscrowContractService>(EscrowContractService);
    _escrowRepository = module.get<Repository<StellarEscrow>>(
      getRepositoryToken(StellarEscrow),
    );
    _signatureRepository = module.get<Repository<EscrowSignature>>(
      getRepositoryToken(EscrowSignature),
    );
    _conditionRepository = module.get<Repository<EscrowCondition>>(
      getRepositoryToken(EscrowCondition),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Multi-Signature Escrow', () => {
    it('should validate required signatures do not exceed participants', async () => {
      const dto = {
        participants: ['GABC123', 'GDEF456'],
        requiredSignatures: 3,
        amount: '1000',
      };

      await expect(service.createMultiSigEscrow(dto)).rejects.toThrow(
        'Required signatures cannot exceed number of participants',
      );
    });

    it('should add signature from valid participant', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        isMultiSig: true,
        participants: ['GABC123', 'GDEF456'],
        requiredSignatures: 2,
        approvalCount: 0,
        signatures: [],
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);
      mockSignatureRepository.findOne.mockResolvedValue(null);
      mockSignatureRepository.create.mockReturnValue({});
      mockSignatureRepository.save.mockResolvedValue({});
      mockEscrowRepository.save.mockResolvedValue({});

      const dto = {
        escrowId: 'escrow123',
        signerAddress: 'GABC123',
        signature: 'sig123',
      };

      const result = await service.addSignature(dto);
      expect(result).toContain('1/2 signatures collected');
      expect(mockSignatureRepository.save).toHaveBeenCalled();
    });

    it('should reject signature from non-participant', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        isMultiSig: true,
        participants: ['GABC123', 'GDEF456'],
        requiredSignatures: 2,
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      const dto = {
        escrowId: 'escrow123',
        signerAddress: 'GXYZ789',
        signature: 'sig123',
      };

      await expect(service.addSignature(dto)).rejects.toThrow(
        'Signer is not a participant in this escrow',
      );
    });

    it('should reject duplicate signature', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        isMultiSig: true,
        participants: ['GABC123', 'GDEF456'],
        requiredSignatures: 2,
      };

      const existingSignature = {
        id: 1,
        escrowId: 1,
        signerAddress: 'GABC123',
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);
      mockSignatureRepository.findOne.mockResolvedValue(existingSignature);

      const dto = {
        escrowId: 'escrow123',
        signerAddress: 'GABC123',
        signature: 'sig123',
      };

      await expect(service.addSignature(dto)).rejects.toThrow(
        'Signer has already signed this escrow',
      );
    });
  });

  describe('Time-Locked Escrow', () => {
    it('should reject release time in the past', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;

      const dto = {
        beneficiary: 'GABC123',
        amount: '1000',
        releaseTime: pastTime,
      };

      await expect(service.createTimeLockedEscrow(dto)).rejects.toThrow(
        'Release time must be in the future',
      );
    });

    it('should check time-lock conditions correctly', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;

      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        isTimeLocked: true,
        releaseTime: futureTime,
        conditions: [
          {
            id: 1,
            conditionType: ConditionType.TIME_LOCK,
            satisfied: false,
          },
        ],
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      const result = await service.checkTimeLockConditions('escrow123');
      expect(result).toBe(false);
    });

    it('should unlock when time has passed', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;

      const mockCondition = {
        id: 1,
        conditionType: ConditionType.TIME_LOCK,
        satisfied: false,
      };

      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        isTimeLocked: true,
        releaseTime: pastTime,
        conditions: [mockCondition],
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);
      mockConditionRepository.save.mockResolvedValue({});

      const result = await service.checkTimeLockConditions('escrow123');
      expect(result).toBe(true);
      expect(mockConditionRepository.save).toHaveBeenCalled();
    });
  });

  describe('Conditional Escrow', () => {
    it('should validate all conditions', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        conditions: [
          {
            id: 1,
            conditionType: ConditionType.TIME_LOCK,
            satisfied: true,
            required: true,
            description: 'Time lock',
          },
          {
            id: 2,
            conditionType: ConditionType.MILESTONE_COMPLETION,
            satisfied: false,
            required: true,
            description: 'Milestone',
          },
        ],
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      const result = await service.validateConditions('escrow123');

      expect(result.allConditionsMet).toBe(false);
      expect(result.requiredConditionsMet).toBe(false);
      expect(result.canRelease).toBe(false);
      expect(result.conditions).toHaveLength(2);
    });

    it('should allow release when all required conditions met', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        conditions: [
          {
            id: 1,
            conditionType: ConditionType.TIME_LOCK,
            satisfied: true,
            required: true,
            description: 'Time lock',
          },
          {
            id: 2,
            conditionType: ConditionType.MILESTONE_COMPLETION,
            satisfied: true,
            required: true,
            description: 'Milestone',
          },
          {
            id: 3,
            conditionType: ConditionType.EXTERNAL_VALIDATION,
            satisfied: false,
            required: false,
            description: 'Optional validation',
          },
        ],
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      const result = await service.validateConditions('escrow123');

      expect(result.allConditionsMet).toBe(false);
      expect(result.requiredConditionsMet).toBe(true);
      expect(result.canRelease).toBe(true);
    });
  });

  describe('Dispute Integration', () => {
    it('should integrate escrow with dispute', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);
      mockEscrowRepository.save.mockResolvedValue({});
      mockConditionRepository.create.mockReturnValue({});
      mockConditionRepository.save.mockResolvedValue({});

      const result = await service.integrateWithDispute(
        'escrow123',
        'dispute456',
      );

      expect(result).toContain('integrated with dispute');
      expect(mockEscrowRepository.save).toHaveBeenCalled();
      expect(mockConditionRepository.save).toHaveBeenCalled();
    });

    it('should reject release without dispute integration', async () => {
      const mockEscrow = {
        id: 1,
        blockchainEscrowId: 'escrow123',
        disputeIntegrated: false,
      };

      mockEscrowRepository.findOne.mockResolvedValue(mockEscrow);

      await expect(
        service.releaseOnDisputeResolution('escrow123', 'FavorLandlord'),
      ).rejects.toThrow('Escrow is not integrated with a dispute');
    });
  });

  describe('Health Check', () => {
    it('should check service health', async () => {
      const result = await service.checkHealth();
      expect(typeof result).toBe('boolean');
    });
  });
});
