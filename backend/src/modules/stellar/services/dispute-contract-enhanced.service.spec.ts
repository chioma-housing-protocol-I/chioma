import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { DisputeContractEnhancedService } from './dispute-contract-enhanced.service';
import { DisputeContractService } from './dispute-contract.service';
import { EscrowContractService } from './escrow-contract.service';
import { Arbiter } from '../../disputes/entities/arbiter.entity';
import { DisputeVote } from '../../disputes/entities/dispute-vote.entity';
import {
  DisputeEvent,
  DisputeEventType,
} from '../../disputes/entities/dispute-event.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';
import { DisputeOutcome } from '../dto/dispute-enhanced.dto';

describe('DisputeContractEnhancedService', () => {
  let service: DisputeContractEnhancedService;
  let arbiterRepository: Repository<Arbiter>;
  let voteRepository: Repository<DisputeVote>;
  let eventRepository: Repository<DisputeEvent>;
  let disputeRepository: Repository<Dispute>;
  let disputeContractService: DisputeContractService;
  let escrowContractService: EscrowContractService;

  const mockArbiterRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockVoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockDisputeRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockDisputeContractService = {
    addArbiter: jest.fn(),
    getArbiter: jest.fn(),
    voteOnDispute: jest.fn(),
    resolveDispute: jest.fn(),
    getDispute: jest.fn(),
  };

  const mockEscrowContractService = {
    releaseOnDisputeResolution: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeContractEnhancedService,
        {
          provide: getRepositoryToken(Arbiter),
          useValue: mockArbiterRepository,
        },
        {
          provide: getRepositoryToken(DisputeVote),
          useValue: mockVoteRepository,
        },
        {
          provide: getRepositoryToken(DisputeEvent),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: mockDisputeRepository,
        },
        {
          provide: DisputeContractService,
          useValue: mockDisputeContractService,
        },
        {
          provide: EscrowContractService,
          useValue: mockEscrowContractService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DisputeContractEnhancedService>(
      DisputeContractEnhancedService,
    );
    arbiterRepository = module.get<Repository<Arbiter>>(
      getRepositoryToken(Arbiter),
    );
    voteRepository = module.get<Repository<DisputeVote>>(
      getRepositoryToken(DisputeVote),
    );
    eventRepository = module.get<Repository<DisputeEvent>>(
      getRepositoryToken(DisputeEvent),
    );
    disputeRepository = module.get<Repository<Dispute>>(
      getRepositoryToken(Dispute),
    );
    disputeContractService = module.get<DisputeContractService>(
      DisputeContractService,
    );
    escrowContractService = module.get<EscrowContractService>(
      EscrowContractService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerArbiter', () => {
    it('should register a new arbiter successfully', async () => {
      const arbiterAddress = 'GARBITERADDRESS123456789';
      const qualifications = 'Legal expert with 10 years experience';
      const stakeAmount = '1000000000';
      const txHash = 'tx_hash_123';

      mockDisputeContractService.addArbiter.mockResolvedValue(txHash);
      mockDisputeContractService.getArbiter.mockResolvedValue({
        address: arbiterAddress,
        addedAt: 1234567890,
        active: true,
      });

      const mockArbiter = {
        id: 1,
        stellarAddress: arbiterAddress,
        active: true,
        blockchainAddedAt: 1234567890,
        transactionHash: txHash,
        metadata: { qualifications, stakeAmount },
      };

      mockArbiterRepository.create.mockReturnValue(mockArbiter);
      mockArbiterRepository.save.mockResolvedValue(mockArbiter);

      const result = await service.registerArbiter(
        arbiterAddress,
        qualifications,
        stakeAmount,
      );

      expect(result).toBe(txHash);
      expect(mockDisputeContractService.addArbiter).toHaveBeenCalledWith(
        arbiterAddress,
      );
      expect(mockArbiterRepository.create).toHaveBeenCalled();
      expect(mockArbiterRepository.save).toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      const arbiterAddress = 'GARBITERADDRESS123456789';
      mockDisputeContractService.addArbiter.mockRejectedValue(
        new Error('Blockchain error'),
      );

      await expect(
        service.registerArbiter(arbiterAddress, 'qualifications', '1000'),
      ).rejects.toThrow('Blockchain error');
    });
  });

  describe('deregisterArbiter', () => {
    it('should deregister an arbiter successfully', async () => {
      const arbiterAddress = 'GARBITERADDRESS123456789';
      const mockArbiter = {
        id: 1,
        stellarAddress: arbiterAddress,
        active: true,
      };

      mockArbiterRepository.findOne.mockResolvedValue(mockArbiter);
      mockArbiterRepository.save.mockResolvedValue({
        ...mockArbiter,
        active: false,
      });

      const result = await service.deregisterArbiter(arbiterAddress);

      expect(result).toContain('deregistered successfully');
      expect(mockArbiterRepository.save).toHaveBeenCalledWith({
        ...mockArbiter,
        active: false,
      });
    });

    it('should throw error if arbiter not found', async () => {
      mockArbiterRepository.findOne.mockResolvedValue(null);

      await expect(service.deregisterArbiter('GNONEXISTENT')).rejects.toThrow(
        'Arbiter not found',
      );
    });
  });

  describe('getArbiterPool', () => {
    it('should return all active arbiters', async () => {
      const mockArbiters = [
        {
          id: 1,
          stellarAddress: 'GARBITER1',
          active: true,
          blockchainAddedAt: 1234567890,
          totalVotes: 10,
          totalDisputesResolved: 5,
          reputationScore: 85.5,
          successfulResolutions: 4,
          metadata: {
            qualifications: 'Expert',
            specialization: 'Property',
            stakeAmount: '1000',
          },
        },
        {
          id: 2,
          stellarAddress: 'GARBITER2',
          active: true,
          blockchainAddedAt: 1234567891,
          totalVotes: 8,
          totalDisputesResolved: 4,
          reputationScore: 75.0,
          successfulResolutions: 3,
          metadata: {
            qualifications: 'Professional',
            stakeAmount: '2000',
          },
        },
      ];

      mockArbiterRepository.find.mockResolvedValue(mockArbiters);

      const result = await service.getArbiterPool();

      expect(result).toHaveLength(2);
      expect(result[0].address).toBe('GARBITER1');
      expect(result[0].reputationScore).toBe(85.5);
      expect(result[1].address).toBe('GARBITER2');
    });
  });

  describe('selectArbitersForDispute', () => {
    it('should select arbiters based on reputation', async () => {
      const disputeId = 'dispute_123';
      const count = 3;

      const mockArbiters = [
        { id: 1, stellarAddress: 'GARBITER1', reputationScore: 90 },
        { id: 2, stellarAddress: 'GARBITER2', reputationScore: 85 },
        { id: 3, stellarAddress: 'GARBITER3', reputationScore: 80 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockArbiters),
      };

      mockArbiterRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const mockEvent = { id: 1 };
      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.selectArbitersForDispute(disputeId, count);

      expect(result).toHaveLength(3);
      expect(result).toEqual(['GARBITER1', 'GARBITER2', 'GARBITER3']);
      expect(mockEventRepository.save).toHaveBeenCalled();
    });
  });

  describe('trackVote', () => {
    it('should track a vote successfully', async () => {
      const disputeId = 'dispute_123';
      const arbiterAddress = 'GARBITER1';
      const vote = true;
      const evidence = 'Evidence document';

      const mockArbiter = {
        id: 1,
        stellarAddress: arbiterAddress,
        totalVotes: 5,
      };

      const mockDispute = {
        id: 1,
        disputeId,
        votesFavorLandlord: 2,
        votesFavorTenant: 1,
      };

      mockArbiterRepository.findOne.mockResolvedValue(mockArbiter);
      mockDisputeRepository.findOne.mockResolvedValue(mockDispute);
      mockVoteRepository.findOne.mockResolvedValue(null);

      const mockVote = {
        id: 1,
        disputeId: mockDispute.id,
        arbiterId: mockArbiter.id,
        favorLandlord: vote,
        evidence,
      };

      mockVoteRepository.create.mockReturnValue(mockVote);
      mockVoteRepository.save.mockResolvedValue(mockVote);
      mockArbiterRepository.save.mockResolvedValue({
        ...mockArbiter,
        totalVotes: 6,
      });
      mockDisputeRepository.save.mockResolvedValue({
        ...mockDispute,
        votesFavorLandlord: 3,
      });

      const mockEvent = { id: 1 };
      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.trackVote(
        disputeId,
        arbiterAddress,
        vote,
        evidence,
      );

      expect(result).toContain('Vote recorded successfully');
      expect(mockVoteRepository.save).toHaveBeenCalled();
      expect(mockArbiterRepository.save).toHaveBeenCalled();
      expect(mockDisputeRepository.save).toHaveBeenCalled();
    });

    it('should prevent duplicate votes', async () => {
      const mockArbiter = { id: 1, stellarAddress: 'GARBITER1' };
      const mockDispute = { id: 1, disputeId: 'dispute_123' };
      const existingVote = { id: 1, disputeId: 1, arbiterId: 1 };

      mockArbiterRepository.findOne.mockResolvedValue(mockArbiter);
      mockDisputeRepository.findOne.mockResolvedValue(mockDispute);
      mockVoteRepository.findOne.mockResolvedValue(existingVote);

      await expect(
        service.trackVote('dispute_123', 'GARBITER1', true),
      ).rejects.toThrow('Arbiter has already voted');
    });
  });

  describe('getVoteResults', () => {
    it('should return vote results with outcome', async () => {
      const disputeId = 'dispute_123';
      const mockDispute = {
        id: 1,
        disputeId,
        votesFavorLandlord: 3,
        votesFavorTenant: 1,
        status: 'RESOLVED',
      };

      const mockVotes = [
        {
          id: 1,
          favorLandlord: true,
          createdAt: new Date(),
          voteWeight: 1,
          arbiter: { stellarAddress: 'GARBITER1' },
        },
        {
          id: 2,
          favorLandlord: true,
          createdAt: new Date(),
          voteWeight: 1,
          arbiter: { stellarAddress: 'GARBITER2' },
        },
      ];

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute);
      mockVoteRepository.find.mockResolvedValue(mockVotes);

      const result = await service.getVoteResults(disputeId);

      expect(result.disputeId).toBe(disputeId);
      expect(result.votesFavorLandlord).toBe(3);
      expect(result.votesFavorTenant).toBe(1);
      expect(result.outcome).toBe(DisputeOutcome.FAVOR_LANDLORD);
      expect(result.votes).toHaveLength(2);
    });
  });

  describe('enforceDisputeResolution', () => {
    it('should enforce resolution and release escrow', async () => {
      const disputeId = 'dispute_123';
      const outcome = DisputeOutcome.FAVOR_LANDLORD;
      const txHash = 'tx_hash_123';

      const mockDispute = {
        id: 1,
        disputeId,
        blockchainAgreementId: 'agreement_123',
        metadata: { escrowId: 'escrow_123' },
      };

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute);
      mockDisputeContractService.resolveDispute.mockResolvedValue({
        outcome,
        txHash,
      });
      mockDisputeRepository.save.mockResolvedValue({
        ...mockDispute,
        status: 'RESOLVED',
      });
      mockEscrowContractService.releaseOnDisputeResolution.mockResolvedValue(
        'Escrow released',
      );

      const mockVotes = [];
      mockVoteRepository.find.mockResolvedValue(mockVotes);

      const mockEvent = { id: 1 };
      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await service.enforceDisputeResolution(disputeId, outcome);

      expect(result.disputeId).toBe(disputeId);
      expect(result.outcome).toBe(outcome);
      expect(result.transactionHash).toBe(txHash);
      expect(result.escrowReleased).toBe(true);
    });
  });

  describe('calculateArbiterReputation', () => {
    it('should calculate reputation score correctly', async () => {
      const arbiterAddress = 'GARBITER1';
      const mockArbiter = {
        stellarAddress: arbiterAddress,
        reputationScore: 85.5,
        totalVotes: 20,
        totalDisputesResolved: 10,
        successfulResolutions: 8,
      };

      mockArbiterRepository.findOne.mockResolvedValue(mockArbiter);

      const result = await service.calculateArbiterReputation(arbiterAddress);

      expect(result.arbiterAddress).toBe(arbiterAddress);
      expect(result.reputationScore).toBe(85.5);
      expect(result.successRate).toBe(80);
    });
  });

  describe('getDisputeTimeline', () => {
    it('should return dispute event timeline', async () => {
      const disputeId = 'dispute_123';
      const mockEvents = [
        {
          id: 1,
          disputeId,
          eventType: DisputeEventType.DISPUTE_RAISED,
          eventData: { raiser: 'tenant' },
          timestamp: new Date('2024-01-01'),
          triggeredBy: 'GTENANT',
          transactionHash: 'tx1',
        },
        {
          id: 2,
          disputeId,
          eventType: DisputeEventType.VOTE_CAST,
          eventData: { arbiter: 'GARBITER1' },
          timestamp: new Date('2024-01-02'),
          triggeredBy: 'GARBITER1',
          transactionHash: 'tx2',
        },
      ];

      mockEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getDisputeTimeline(disputeId);

      expect(result.disputeId).toBe(disputeId);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].eventType).toBe(DisputeEventType.DISPUTE_RAISED);
    });
  });
});
