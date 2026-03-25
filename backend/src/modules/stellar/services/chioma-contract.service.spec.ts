import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChiomaContractService } from './chioma-contract.service';

describe('ChiomaContractService', () => {
  let service: ChiomaContractService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        CHIOMA_CONTRACT_ID:
          'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        STELLAR_ADMIN_SECRET_KEY: '', // Empty to skip keypair creation in tests
        STELLAR_NETWORK: 'testnet',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChiomaContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ChiomaContractService>(ChiomaContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have checkHealth method', () => {
    expect(service.checkHealth).toBeDefined();
  });

  it('should have all contract methods', () => {
    expect(service.createAgreement).toBeDefined();
    expect(service.signAgreement).toBeDefined();
    expect(service.submitAgreement).toBeDefined();
    expect(service.cancelAgreement).toBeDefined();
    expect(service.getAgreement).toBeDefined();
    expect(service.hasAgreement).toBeDefined();
    expect(service.getAgreementCount).toBeDefined();
    expect(service.getPaymentSplit).toBeDefined();
  });
});
