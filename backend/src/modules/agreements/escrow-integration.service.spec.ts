import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { EscrowIntegrationService } from './escrow-integration.service';
import { StellarEscrow } from '../stellar/entities/stellar-escrow.entity';
import { EscrowContractService } from '../stellar/services/escrow-contract.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';

describe('EscrowIntegrationService', () => {
  let service: EscrowIntegrationService;

  const mockAgreement = {
    id: 'agreement-1',
    securityDeposit: 500,
    userStellarPubKey: `G${'A'.repeat(55)}`,
    adminStellarPubKey: `G${'B'.repeat(55)}`,
  } as unknown as RentAgreement;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((data: unknown) =>
        Promise.resolve({ id: 'escrow-1', ...(data as object) }),
      ),
      findOne: jest.fn(),
    },
  };

  let escrowContractService: jest.Mocked<EscrowContractService>;

  const buildModule = async (): Promise<TestingModule> =>
    Test.createTestingModule({
      providers: [
        EscrowIntegrationService,
        {
          provide: getRepositoryToken(StellarEscrow),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RentAgreement),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockAgreement),
          },
        },
        {
          provide: EscrowContractService,
          useValue: {
            createEscrow: jest.fn().mockResolvedValue('tx-hash-123'),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

  const originalArbiter = process.env.DEFAULT_ARBITER_ADDRESS;

  afterEach(() => {
    process.env.DEFAULT_ARBITER_ADDRESS = originalArbiter;
    jest.clearAllMocks();
  });

  describe('with a valid DEFAULT_ARBITER_ADDRESS', () => {
    beforeEach(async () => {
      process.env.DEFAULT_ARBITER_ADDRESS = `G${'C'.repeat(55)}`;
      const module = await buildModule();
      service = module.get(EscrowIntegrationService);
      escrowContractService = module.get(EscrowContractService);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAgreement);
    });

    it('creates the escrow using the configured arbiter address', async () => {
      const result = await service.createEscrowForAgreement('agreement-1');

      expect(result).toBeDefined();
      expect(escrowContractService.createEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          arbiter: process.env.DEFAULT_ARBITER_ADDRESS,
        }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });
  });

  describe('with a missing DEFAULT_ARBITER_ADDRESS', () => {
    beforeEach(async () => {
      delete process.env.DEFAULT_ARBITER_ADDRESS;
      const module = await buildModule();
      service = module.get(EscrowIntegrationService);
      escrowContractService = module.get(EscrowContractService);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAgreement);
    });

    it('rejects escrow creation instead of proceeding with an empty arbiter address', async () => {
      await expect(
        service.createEscrowForAgreement('agreement-1'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(escrowContractService.createEscrow).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('with an invalid DEFAULT_ARBITER_ADDRESS', () => {
    beforeEach(async () => {
      process.env.DEFAULT_ARBITER_ADDRESS = 'not-a-real-stellar-address';
      const module = await buildModule();
      service = module.get(EscrowIntegrationService);
      escrowContractService = module.get(EscrowContractService);
      mockQueryRunner.manager.findOne.mockResolvedValue(mockAgreement);
    });

    it('rejects escrow creation for a malformed arbiter address', async () => {
      await expect(
        service.createEscrowForAgreement('agreement-1'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(escrowContractService.createEscrow).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
