import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRegistryService } from './agent-registry.service';
import { AgentTransaction } from '../entities/agent-transaction.entity';

describe('AgentRegistryService', () => {
  let service: AgentRegistryService;
  let repository: Repository<AgentTransaction>;

  const mockRepository = {
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        AGENT_REGISTRY_CONTRACT_ID:
          'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        STELLAR_ADMIN_SECRET_KEY:
          'SBH4D4S2WK6VQZGKMHW5SGCHACJKDYGW52RFDEWAYQQTAABXQASX7QDB',
        STELLAR_NETWORK: 'testnet',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRegistryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(AgentTransaction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AgentRegistryService>(AgentRegistryService);
    repository = module.get<Repository<AgentTransaction>>(
      getRepositoryToken(AgentTransaction),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerAgent', () => {
    it('should throw error if contract not configured', async () => {
      const serviceWithoutContract = new AgentRegistryService(
        {
          get: jest.fn(() => ''),
        } as any,
        repository,
      );

      await expect(
        serviceWithoutContract.registerAgent('GTEST123', 'hash123'),
      ).rejects.toThrow('Agent registry contract not configured');
    });
  });

  describe('getAgentCount', () => {
    it('should throw error if contract not configured', async () => {
      const serviceWithoutContract = new AgentRegistryService(
        {
          get: jest.fn(() => ''),
        } as any,
        repository,
      );

      await expect(serviceWithoutContract.getAgentCount()).rejects.toThrow(
        'Agent registry contract not configured',
      );
    });
  });
});
