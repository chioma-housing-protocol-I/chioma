import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EscrowContractService } from './escrow-contract.service';

describe('EscrowContractService', () => {
  let service: EscrowContractService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        ESCROW_CONTRACT_ID:
          'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        STELLAR_ADMIN_SECRET_KEY: '',
        STELLAR_NETWORK: 'testnet',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EscrowContractService>(EscrowContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have checkHealth method', () => {
    expect(service.checkHealth).toBeDefined();
  });

  it('should have all escrow methods', () => {
    expect(service.createEscrow).toBeDefined();
    expect(service.fundEscrow).toBeDefined();
    expect(service.approveRelease).toBeDefined();
    expect(service.raiseDispute).toBeDefined();
    expect(service.resolveDispute).toBeDefined();
    expect(service.getEscrow).toBeDefined();
    expect(service.getApprovalCount).toBeDefined();
    expect(service.createMultiSigEscrow).toBeDefined();
    expect(service.addSignature).toBeDefined();
    expect(service.releaseWithSignatures).toBeDefined();
    expect(service.createTimeLockedEscrow).toBeDefined();
    expect(service.checkTimeLockConditions).toBeDefined();
    expect(service.createConditionalEscrow).toBeDefined();
    expect(service.validateConditions).toBeDefined();
    expect(service.integrateWithDispute).toBeDefined();
    expect(service.releaseOnDisputeResolution).toBeDefined();
  });
});
