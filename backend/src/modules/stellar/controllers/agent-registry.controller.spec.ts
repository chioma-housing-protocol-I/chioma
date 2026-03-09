import { Test, TestingModule } from '@nestjs/testing';
import { AgentRegistryController } from './agent-registry.controller';
import { AgentRegistryService } from '../services/agent-registry.service';

describe('AgentRegistryController', () => {
  let controller: AgentRegistryController;
  let service: AgentRegistryService;

  const mockAgentRegistryService = {
    registerAgent: jest.fn(),
    verifyAgent: jest.fn(),
    rateAgent: jest.fn(),
    getAgentInfo: jest.fn(),
    getAgentCount: jest.fn(),
    registerTransaction: jest.fn(),
    completeTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentRegistryController],
      providers: [
        {
          provide: AgentRegistryService,
          useValue: mockAgentRegistryService,
        },
      ],
    }).compile();

    controller = module.get<AgentRegistryController>(AgentRegistryController);
    service = module.get<AgentRegistryService>(AgentRegistryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerAgent', () => {
    it('should register an agent', async () => {
      const dto = {
        agentAddress: 'GTEST123',
        profileHash: 'hash123',
      };
      mockAgentRegistryService.registerAgent.mockResolvedValue('txhash123');

      const result = await controller.registerAgent(dto);

      expect(result).toEqual({
        txHash: 'txhash123',
        message: 'Agent registered on-chain',
      });
      expect(service.registerAgent).toHaveBeenCalledWith(
        dto.agentAddress,
        dto.profileHash,
      );
    });
  });

  describe('getAgentInfo', () => {
    it('should return agent info', async () => {
      const agentInfo = {
        agent: 'GTEST123',
        externalProfileHash: 'hash123',
        verified: true,
        registeredAt: 1234567890,
        verifiedAt: 1234567900,
        totalRatings: 10,
        totalScore: 45,
        completedAgreements: 5,
        averageRating: 4.5,
      };
      mockAgentRegistryService.getAgentInfo.mockResolvedValue(agentInfo);

      const result = await controller.getAgentInfo('GTEST123');

      expect(result).toEqual(agentInfo);
      expect(service.getAgentInfo).toHaveBeenCalledWith('GTEST123');
    });

    it('should return message if agent not found', async () => {
      mockAgentRegistryService.getAgentInfo.mockResolvedValue(null);

      const result = await controller.getAgentInfo('GTEST123');

      expect(result).toEqual({ message: 'Agent not found' });
    });
  });

  describe('rateAgent', () => {
    it('should submit rating', async () => {
      const dto = {
        raterAddress: 'GRATER123',
        agentAddress: 'GTEST123',
        score: 5,
        transactionId: 'tx123',
      };
      mockAgentRegistryService.rateAgent.mockResolvedValue('txhash123');

      const result = await controller.rateAgent(dto);

      expect(result).toEqual({
        txHash: 'txhash123',
        message: 'Rating submitted on-chain',
      });
      expect(service.rateAgent).toHaveBeenCalledWith(
        dto.raterAddress,
        dto.agentAddress,
        dto.score,
        dto.transactionId,
      );
    });
  });

  describe('getAgentCount', () => {
    it('should return agent count', async () => {
      mockAgentRegistryService.getAgentCount.mockResolvedValue(42);

      const result = await controller.getAgentCount();

      expect(result).toEqual({ count: 42 });
      expect(service.getAgentCount).toHaveBeenCalled();
    });
  });

  describe('registerTransaction', () => {
    it('should register transaction', async () => {
      const dto = {
        transactionId: 'tx123',
        agentAddress: 'GTEST123',
        parties: ['GPARTY1', 'GPARTY2'],
      };
      mockAgentRegistryService.registerTransaction.mockResolvedValue(
        'txhash123',
      );

      const result = await controller.registerTransaction(dto);

      expect(result).toEqual({
        txHash: 'txhash123',
        message: 'Transaction registered on-chain',
      });
      expect(service.registerTransaction).toHaveBeenCalledWith(
        dto.transactionId,
        dto.agentAddress,
        dto.parties,
      );
    });
  });

  describe('completeTransaction', () => {
    it('should complete transaction', async () => {
      const dto = {
        transactionId: 'tx123',
        agentAddress: 'GTEST123',
      };
      mockAgentRegistryService.completeTransaction.mockResolvedValue(
        'txhash123',
      );

      const result = await controller.completeTransaction(dto);

      expect(result).toEqual({
        txHash: 'txhash123',
        message: 'Transaction completed on-chain',
      });
      expect(service.completeTransaction).toHaveBeenCalledWith(
        dto.transactionId,
        dto.agentAddress,
      );
    });
  });
});
