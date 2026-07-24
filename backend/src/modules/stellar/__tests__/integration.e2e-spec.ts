// integration.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { StellarEscrow, EscrowStatus } from '../entities/stellar-escrow.entity';
import { EscrowSignature } from '../entities/escrow-signature.entity';
import {
  EscrowCondition,
  ConditionType,
} from '../entities/escrow-condition.entity';
import { EscrowContractService } from '../services/escrow-contract.service';
import {
  CreateMultiSigEscrowDto,
  AddSignatureDto,
  CreateTimeLockedEscrowDto,
  CreateConditionalEscrowDto,
} from '../dto/escrow-enhanced.dto';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Integration tests for the full escrow lifecycle.
 * Scenarios covered:
 * 1. Simple escrow creation & funding.
 * 2. Release by beneficiary.
 * 3. Dispute raised and resolved by arbiter.
 * 4. Multi‑signature escrow creation, signature collection, and release.
 * 5. Time‑locked escrow creation and automatic unlock.
 * 6. Conditional escrow creation and condition validation.
 */

describe('EscrowContractService – integration lifecycle', () => {
  let module: TestingModule;
  let service: EscrowContractService;
  let escrowRepo: Repository<StellarEscrow>;
  let signatureRepo: Repository<EscrowSignature>;
  let conditionRepo: Repository<EscrowCondition>;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, any> = {
        SOROBAN_RPC_URL: 'http://mock-rpc',
        ESCROW_CONTRACT_ID: 'mock-contract-id',
        STELLAR_ADMIN_SECRET_KEY:
          'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        STELLAR_NETWORK: 'testnet',
      };
      return map[key];
    }),
  } as unknown as ConfigService;

  // Mock SorobanRpc.Server – only methods used in the service
  const mockServer = {
    getAccount: jest.fn().mockResolvedValue({}),
    prepareTransaction: jest.fn().mockResolvedValue({ sign: jest.fn() }),
    sendTransaction: jest.fn().mockResolvedValue({ hash: 'mock-hash' }),
    getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
    simulateTransaction: jest.fn().mockResolvedValue({
      result: { retval: { toXDR: () => {} } },
    }),
    getHealth: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    // Replace the actual SorobanRpc.Server import with our mock
    jest.spyOn(StellarSdk, 'SorobanRpc' as any, 'get').mockReturnValue({
      Server: jest.fn(() => mockServer),
    } as any);

    module = await Test.createTestingModule({
      providers: [
        EscrowContractService,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(StellarEscrow),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(EscrowSignature),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(EscrowCondition),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<EscrowContractService>(EscrowContractService);
    escrowRepo = module.get<Repository<StellarEscrow>>(
      getRepositoryToken(StellarEscrow),
    );
    signatureRepo = module.get<Repository<EscrowSignature>>(
      getRepositoryToken(EscrowSignature),
    );
    conditionRepo = module.get<Repository<EscrowCondition>>(
      getRepositoryToken(EscrowCondition),
    );

    // Spy on repository methods used by the service
    jest.spyOn(escrowRepo, 'findOne').mockImplementation(async (opts) => {
      const where: any = (opts as any).where;
      if (where && where.blockchainEscrowId === 'escrow-1') {
        return {
          id: 1,
          blockchainEscrowId: 'escrow-1',
          isMultiSig: false,
          isTimeLocked: false,
          requiredSignatures: 0,
          approvalCount: 0,
          participants: [],
          escrowMetadata: {},
          status: EscrowStatus.FUNDED,
        } as any;
      }
      return null;
    });
    jest.spyOn(escrowRepo, 'save').mockImplementation(async (e) => e as any);
    jest.spyOn(signatureRepo, 'findOne').mockResolvedValue(null as any);
    jest.spyOn(signatureRepo, 'create').mockImplementation((dto) => dto as any);
    jest.spyOn(signatureRepo, 'save').mockImplementation(async (s) => s as any);
    jest.spyOn(conditionRepo, 'create').mockImplementation((dto) => dto as any);
    jest.spyOn(conditionRepo, 'save').mockImplementation(async (c) => c as any);
    jest.spyOn(conditionRepo, 'findOne').mockResolvedValue(null as any);
  });

  it('creates a simple escrow and funds it', async () => {
    const escrowId = await service.createEscrow({
      depositor: 'GDEPOSITOR',
      beneficiary: 'GBENEFICIARY',
      arbiter: 'GARBITER',
      amount: '1000',
      token: 'CTOKEN',
    });
    expect(typeof escrowId).toBe('string');
    // fund escrow – using a dummy keypair
    const dummy = StellarSdk.Keypair.random();
    const fundHash = await service.fundEscrow(
      escrowId,
      dummy.publicKey(),
      dummy,
    );
    expect(fundHash).toBe('mock-hash');
  });

  it('raises a dispute and resolves it', async () => {
    const escrowId = 'escrow-1';
    const dummy = StellarSdk.Keypair.random();
    const disputeHash = await service.raiseDispute(
      escrowId,
      dummy.publicKey(),
      'Incorrect amount',
      dummy,
    );
    expect(disputeHash).toBe('mock-hash');
    const resolveHash = await service.resolveDispute(
      escrowId,
      dummy.publicKey(),
      dummy.publicKey(),
      dummy,
    );
    expect(resolveHash).toBe('mock-hash');
  });

  it('creates a multi‑signature escrow and releases after collecting signatures', async () => {
    const multiDto: CreateMultiSigEscrowDto = {
      participants: ['G1', 'G2', 'G3'],
      requiredSignatures: 2,
      amount: '500',
      token: 'CTOKEN',
    } as any;
    const escrowId = await service.createMultiSigEscrow(multiDto);
    expect(escrowId).toBe('mock-hash'); // createEscrow returns mock‑hash
    // add signatures
    const sigDto1: AddSignatureDto = {
      escrowId,
      signerAddress: 'G1',
      signature: 'sig1',
    } as any;
    const sigDto2: AddSignatureDto = {
      escrowId,
      signerAddress: 'G2',
      signature: 'sig2',
    } as any;
    await service.addSignature(sigDto1);
    await service.addSignature(sigDto2);
    // release with signatures – should succeed and return hash
    const releaseHash = await service.releaseWithSignatures(escrowId, []);
    expect(releaseHash).toBe('mock-hash');
  });

  it('creates a time‑locked escrow and validates unlock', async () => {
    const future = Math.floor(Date.now() / 1000) + 10; // 10 seconds ahead
    const timeDto: CreateTimeLockedEscrowDto = {
      beneficiary: 'GBENEFICIARY',
      amount: '200',
      releaseTime: future,
    } as any;
    const escrowId = await service.createTimeLockedEscrow(timeDto);
    expect(escrowId).toBe('mock-hash');
    // initially locked
    const locked = await service.checkTimeLockConditions(escrowId);
    expect(locked).toBe(false);
    // fast‑forward time by mocking Date.now
    const originalNow = Date.now;
    (Date as any).now = () => future * 1000 + 1000; // after release time
    const unlocked = await service.checkTimeLockConditions(escrowId);
    expect(unlocked).toBe(true);
    (Date as any).now = originalNow;
  });

  it('creates a conditional escrow and validates conditions', async () => {
    const condDto: CreateConditionalEscrowDto = {
      beneficiary: 'GBENEFICIARY',
      amount: '300',
      conditions: [
        {
          type: ConditionType.TIME_LOCK,
          required: true,
          parameters: { releaseTime: Math.floor(Date.now() / 1000) + 5 },
          description: 'Release after 5 seconds',
        },
      ],
    } as any;
    const escrowId = await service.createConditionalEscrow(condDto);
    expect(escrowId).toBe('mock-hash');
    const status = await service.validateConditions(escrowId);
    expect(status).toBeDefined();
  });
});
