import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DisputeContractService } from '../services/dispute-contract.service';
import { Arbiter } from '../entities/arbiter.entity';
import { DisputeVote } from '../entities/dispute-vote.entity';
import { DisputeEvent } from '../entities/dispute-event.entity';
import { DisputeEventType } from '../entities/dispute-event.entity';

describe('DisputeContractService', () => {
  let service: DisputeContractService;
  let arbiterRepository: Repository<Arbiter>;
  let disputeVoteRepository: Repository<DisputeVote>;
  let disputeEventRepository: Repository<DisputeEvent>;
  let configService: ConfigService;

  const mockArbiterRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };

  const mockDisputeVoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDisputeEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TypeOrmModule.forFeature([Arbiter, DisputeVote, DisputeEvent])],
      providers: [
        DisputeContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(Arbiter),
          useValue: mockArbiterRepository,
        },
        {
          provide: getRepositoryToken(DisputeVote),
          useValue: mockDisputeVoteRepository,
        },
        {
          provide: getRepositoryToken(DisputeEvent),
          useValue: mockDisputeEventRepository,
        },
      ],
    }).compile();

    service = module.get<DisputeContractService>(DisputeContractService);
    arbiterRepository = module.get<Repository<Arbiter>>(getRepositoryToken(Arbiter));
    disputeVoteRepository = module.get<Repository<DisputeVote>>(getRepositoryToken(DisputeVote));
    disputeEventRepository = module.get<Repository<DisputeEvent>>(getRepositoryToken(DisputeEvent));
    configService = module.get<ConfigService>(ConfigService);

    // Mock config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'DISPUTE_CONTRACT_ID': 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        'SOROBAN_RPC_URL': 'https://soroban-testnet.stellar.org',
        'STELLAR_NETWORK': 'testnet',
        'STELLAR_ADMIN_SECRET_KEY': 'SAB5JY2K4V2J7J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4',
      };
      return config[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerArbiter', () => {
    it('should register an arbiter successfully', async () => {
      const arbiterData = {
        address: 'GABCD1234567890',
        qualifications: 'Test qualifications',
        stakeAmount: '1000',
      };

      const mockArbiter = {
        ...arbiterData,
        isActive: true,
        reputationScore: 0,
        totalDisputes: 0,
        successfulResolutions: 0,
        registeredAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockArbiterRepository.create.mockReturnValue(mockArbiter);
      mockArbiterRepository.save.mockResolvedValue(mockArbiter);
      mockDisputeEventRepository.create.mockReturnValue({});
      mockDisputeEventRepository.save.mockResolvedValue({});

      // Mock the blockchain call
      jest.spyOn(service as any, 'addArbiter').mockResolvedValue('mock-tx-hash');

      const result = await service.registerArbiter(arbiterData.address, arbiterData.qualifications, arbiterData.stakeAmount);

      expect(result).toBe('mock-tx-hash');
      expect(mockArbiterRepository.create).toHaveBeenCalledWith(mockArbiter);
      expect(mockArbiterRepository.save).toHaveBeenCalledWith(mockArbiter);
    });
  });

  describe('getArbiterPool', () => {
    it('should return active arbiters sorted by reputation', async () => {
      const mockArbiters = [
        {
          address: 'GABCD1234567890',
          qualifications: 'Senior Arbiter',
          specialization: 'Rent Disputes',
          stakeAmount: '1000',
          isActive: true,
          reputationScore: 100,
          totalDisputes: 10,
          successfulResolutions: 9,
          registeredAt: new Date(),
          lastActiveAt: new Date(),
        },
        {
          address: 'GEFHI1234567890',
          qualifications: 'Junior Arbiter',
          specialization: 'Payment Disputes',
          stakeAmount: '500',
          isActive: true,
          reputationScore: 50,
          totalDisputes: 5,
          successfulResolutions: 4,
          registeredAt: new Date(),
          lastActiveAt: new Date(),
        },
      ];

      mockArbiterRepository.find.mockResolvedValue(mockArbiters);

      const result = await service.getArbiterPool();

      expect(result).toHaveLength(2);
      expect(result[0].reputationScore).toBeGreaterThan(result[1].reputationScore);
      expect(mockArbiterRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { reputationScore: 'DESC' }
      });
    });
  });

  describe('selectArbitersForDispute', () => {
    it('should select arbiters for a dispute', async () => {
      const mockArbiters = [
        { address: 'GABCD1234567890', reputationScore: 100 },
        { address: 'GEFHI1234567890', reputationScore: 50 },
        { address: 'GJKLM1234567890', reputationScore: 25 },
      ];

      mockArbiterRepository.find.mockResolvedValue(mockArbiters);
      mockDisputeEventRepository.create.mockReturnValue({});
      mockDisputeEventRepository.save.mockResolvedValue({});

      const result = await service.selectArbitersForDispute('dispute-123', 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('GABCD1234567890');
      expect(result[1]).toBe('GEFHI1234567890');
    });

    it('should throw error if insufficient arbiters available', async () => {
      mockArbiterRepository.find.mockResolvedValue([]);

      await expect(service.selectArbitersForDispute('dispute-123', 2)).rejects.toThrow(
        'Insufficient arbiters available. Required: 2, Available: 0'
      );
    });
  });

  describe('trackVote', () => {
    it('should track a vote successfully', async () => {
      const voteData = {
        disputeId: 'dispute-123',
        arbiterAddress: 'GABCD1234567890',
        vote: true,
        evidence: 'Evidence text',
      };

      const mockVote = {
        ...voteData,
        votedAt: new Date(),
        transactionHash: 'mock-tx-hash',
      };

      mockDisputeVoteRepository.create.mockReturnValue(mockVote);
      mockDisputeVoteRepository.save.mockResolvedValue(mockVote);
      mockArbiterRepository.increment.mockResolvedValue({});
      mockDisputeEventRepository.create.mockReturnValue({});
      mockDisputeEventRepository.save.mockResolvedValue({});

      // Mock the blockchain call
      jest.spyOn(service as any, 'voteOnDispute').mockResolvedValue('mock-tx-hash');

      const result = await service.trackVote(voteData.disputeId, voteData.arbiterAddress, voteData.vote, voteData.evidence);

      expect(result).toBe('mock-tx-hash');
      expect(mockDisputeVoteRepository.create).toHaveBeenCalledWith({
        ...voteData,
        votedAt: expect.any(Date),
        transactionHash: 'mock-tx-hash',
      });
      expect(mockArbiterRepository.increment).toHaveBeenCalledWith(
        { address: voteData.arbiterAddress },
        'totalDisputes', 1
      );
    });
  });

  describe('getVoteResults', () => {
    it('should calculate vote results correctly', async () => {
      const mockVotes = [
        { vote: true }, // favor landlord
        { vote: true }, // favor landlord
        { vote: false }, // favor tenant
      ];

      mockDisputeVoteRepository.find.mockResolvedValue(mockVotes);

      // Mock getDispute to return resolved dispute
      jest.spyOn(service as any, 'getDispute').mockResolvedValue({
        resolved: true,
        outcome: 'FavorLandlord',
      });

      const result = await service.getVoteResults('dispute-123');

      expect(result.votesFavorLandlord).toBe(2);
      expect(result.votesFavorTenant).toBe(1);
      expect(result.totalVotes).toBe(3);
      expect(result.isComplete).toBe(true);
      expect(result.outcome).toBe('FavorLandlord');
    });
  });

  describe('calculateArbiterReputation', () => {
    it('should calculate arbiter reputation correctly', async () => {
      const mockArbiter = {
        address: 'GABCD1234567890',
        reputationScore: 80,
        totalDisputes: 10,
        successfulResolutions: 8,
        isActive: true,
      };

      mockArbiterRepository.findOne.mockResolvedValue(mockArbiter);

      const result = await service.calculateArbiterReputation('GABCD1234567890');

      expect(result.score).toBe(80);
      expect(result.totalDisputes).toBe(10);
      expect(result.successfulResolutions).toBe(8);
      expect(result.successRate).toBe(80);
      expect(result.isActive).toBe(true);
    });

    it('should throw error if arbiter not found', async () => {
      mockArbiterRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateArbiterReputation('GABCD1234567890')).rejects.toThrow(
        'Arbiter not found: GABCD1234567890'
      );
    });
  });

  describe('getDisputeTimeline', () => {
    it('should return dispute timeline events', async () => {
      const mockEvents = [
        {
          id: 1,
          disputeId: 'dispute-123',
          eventType: DisputeEventType.DISPUTE_RAISED,
          eventData: JSON.stringify({}),
          timestamp: new Date(),
          triggeredBy: 'user-123',
        },
        {
          id: 2,
          disputeId: 'dispute-123',
          eventType: DisputeEventType.VOTE_CAST,
          eventData: JSON.stringify({ vote: true }),
          timestamp: new Date(),
          triggeredBy: 'arbiter-123',
        },
      ];

      mockDisputeEventRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getDisputeTimeline('dispute-123');

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe(DisputeEventType.DISPUTE_RAISED);
      expect(result[1].eventType).toBe(DisputeEventType.VOTE_CAST);
      expect(mockDisputeEventRepository.find).toHaveBeenCalledWith({
        where: { disputeId: 'dispute-123' },
        order: { timestamp: 'ASC' }
      });
    });
  });
});
