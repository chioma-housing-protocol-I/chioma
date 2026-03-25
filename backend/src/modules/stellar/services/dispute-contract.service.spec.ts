import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DisputeContractService } from './dispute-contract.service';

describe('DisputeContractService', () => {
  let service: DisputeContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeContractService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                DISPUTE_CONTRACT_ID: 'test-contract-id',
                SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
                STELLAR_NETWORK: 'testnet',
                STELLAR_ADMIN_SECRET_KEY: '',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DisputeContractService>(DisputeContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have contract configuration', () => {
    expect(service['contractId']).toBe('test-contract-id');
    expect(service['rpcUrl']).toBe('https://soroban-testnet.stellar.org');
    expect(service['network']).toBe('testnet');
  });

  it('should handle missing admin keypair gracefully', async () => {
    const result = await service.getArbiterCount();
    expect(result).toBe(0);
  });
});
