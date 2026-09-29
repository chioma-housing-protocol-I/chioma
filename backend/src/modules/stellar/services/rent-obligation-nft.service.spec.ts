import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { xdr, Address } from '@stellar/stellar-sdk';
import { RentObligationNftService } from './rent-obligation-nft.service';
import { BlockchainTransactionError } from '../../../common/errors/domain-errors';

const mockSendTransaction = jest.fn();
const mockSimulateTransaction = jest.fn();
const mockGetAccount = jest.fn();

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk');
  const mockTx = { sign: jest.fn() };
  return {
    ...actual,
    SorobanRpc: {
      ...actual.SorobanRpc,
      Api: {
        ...actual.SorobanRpc.Api,
        isSimulationError: jest.fn().mockReturnValue(false),
        isSimulationSuccess: jest.fn().mockReturnValue(true),
      },
      Server: jest.fn().mockImplementation(() => ({
        getAccount: (...args: unknown[]) => mockGetAccount(...args),
        simulateTransaction: (...args: unknown[]) =>
          mockSimulateTransaction(...args),
        sendTransaction: (...args: unknown[]) => mockSendTransaction(...args),
      })),
      assembleTransaction: jest.fn().mockReturnValue({
        build: jest.fn().mockReturnValue(mockTx),
      }),
    },
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue('mock-operation'),
    })),
    Keypair: {
      fromSecret: jest.fn().mockReturnValue({ publicKey: () => 'GADMIN' }),
    },
    Account: jest.fn().mockImplementation(() => ({})),
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockTx),
    })),
  };
});

const OWNER_ADDRESS =
  'GDBVWDMYONNID3S2Q7DNSYFNW2EX7UQBBJDQSZH3OHH2WAQKY74JJWXE';
const ADMIN_ADDRESS =
  'GC4NLUIPQ3QDBC7HLCFWY47WQJNPHXGRFBW5GK7ADSRXVLSSUZ5TUQOZ';
const NEW_OWNER_ADDRESS =
  'GA7JCDMFINQJ53T5QPM4GQN7EW3JZEKMOAKMC2Z6EYW77YP47TJNCTOU';

describe('RentObligationNftService', () => {
  let service: RentObligationNftService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'SOROBAN_RPC_URL') return 'http://localhost';
      if (key === 'RENT_OBLIGATION_CONTRACT_ID') return 'C_MOCK_CONTRACT_ID';
      if (key === 'STELLAR_ADMIN_SECRET_KEY') return 'SADMIN_SECRET';
      if (key === 'STELLAR_NETWORK') return defaultValue ?? 'testnet';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RentObligationNftService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(RentObligationNftService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('burnObligation', () => {
    it('builds and sends a burn transaction', async () => {
      mockGetAccount.mockResolvedValue({ sequenceNumber: () => '1' });
      mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
      mockSendTransaction.mockResolvedValue({ hash: 'burn-tx-hash' });

      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationError',
        )
        .mockReturnValue(false);

      const result = await service.burnObligation({
        tokenId: 'token-123',
        reason: 'AgreementTerminated',
        ownerAddress: OWNER_ADDRESS,
      });

      expect(result.txHash).toBe('burn-tx-hash');
      expect(mockSendTransaction).toHaveBeenCalled();
    });

    it('throws when the contract is not configured', async () => {
      mockConfigService.get.mockImplementationOnce(() => '');
      const unconfiguredModule = await Test.createTestingModule({
        providers: [
          RentObligationNftService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => ''),
            },
          },
        ],
      }).compile();
      const unconfiguredService = unconfiguredModule.get(
        RentObligationNftService,
      );

      await expect(
        unconfiguredService.burnObligation({
          tokenId: 'token-123',
          reason: 'AgreementTerminated',
          ownerAddress: OWNER_ADDRESS,
        }),
      ).rejects.toThrow('Contract not configured');
    });
  });

  describe('adminReassignObligation', () => {
    it('builds and sends an admin reassign transaction', async () => {
      mockGetAccount.mockResolvedValue({ sequenceNumber: () => '1' });
      mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
      mockSendTransaction.mockResolvedValue({ hash: 'reassign-tx-hash' });

      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationError',
        )
        .mockReturnValue(false);

      const result = await service.adminReassignObligation({
        agreementId: 'agreement-123',
        newOwnerAddress: NEW_OWNER_ADDRESS,
        adminAddress: ADMIN_ADDRESS,
      });

      expect(result.txHash).toBe('reassign-tx-hash');
      expect(mockSendTransaction).toHaveBeenCalled();
    });
  });

  describe('canBurn', () => {
    it('returns true when the contract reports the token is burnable', async () => {
      mockSimulateTransaction.mockResolvedValue({
        result: { retval: xdr.ScVal.scvBool(true) },
      });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(true);

      const result = await service.canBurn('token-123');

      expect(result).toBe(true);
    });

    it('returns false on simulation failure', async () => {
      mockSimulateTransaction.mockResolvedValue({ result: undefined });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(false);

      const result = await service.canBurn('token-123');

      expect(result).toBe(false);
    });
  });

  describe('getBurnRecord', () => {
    it('parses a burn record map into BurnRecordData', async () => {
      const retval = xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('token_id'),
          val: xdr.ScVal.scvString('token-123'),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('burned_by'),
          val: new Address(OWNER_ADDRESS).toScVal(),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('burned_at'),
          val: xdr.ScVal.scvU64(new xdr.Uint64(1700000000)),
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvString('reason'),
          val: xdr.ScVal.scvString('AgreementTerminated'),
        }),
      ]);

      mockSimulateTransaction.mockResolvedValue({ result: { retval } });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(true);

      const result = await service.getBurnRecord('token-123');

      expect(result).toEqual({
        tokenId: 'token-123',
        burnedBy: OWNER_ADDRESS,
        burnedAt: 1700000000,
        reason: 'AgreementTerminated',
      });
    });

    it('returns null when simulation does not succeed', async () => {
      mockSimulateTransaction.mockResolvedValue({ result: undefined });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(false);

      const result = await service.getBurnRecord('token-123');

      expect(result).toBeNull();
    });
  });

  describe('transaction response validation', () => {
    beforeEach(() => {
      mockGetAccount.mockResolvedValue({ sequenceNumber: () => '1' });
      mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationError',
        )
        .mockReturnValue(false);
    });

    it('throws BlockchainTransactionError when mint response has no hash', async () => {
      mockSendTransaction.mockResolvedValue({ status: 'PENDING' });

      await expect(
        service.mintObligation({
          agreementId: 'agreement-123',
          adminAddress: ADMIN_ADDRESS,
        }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws BlockchainTransactionError when the transfer response is missing', async () => {
      mockSendTransaction.mockResolvedValue(undefined);

      await expect(
        service.transferObligation({
          agreementId: 'agreement-123',
          fromAddress: OWNER_ADDRESS,
          toAddress: NEW_OWNER_ADDRESS,
        }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws BlockchainTransactionError when the burn hash is empty', async () => {
      mockSendTransaction.mockResolvedValue({ hash: '', status: 'ERROR' });

      await expect(
        service.burnObligation({
          tokenId: 'token-123',
          reason: 'AgreementTerminated',
          ownerAddress: OWNER_ADDRESS,
        }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws BlockchainTransactionError when admin reassign response is null', async () => {
      mockSendTransaction.mockResolvedValue(null);

      await expect(
        service.adminReassignObligation({
          agreementId: 'agreement-123',
          newOwnerAddress: NEW_OWNER_ADDRESS,
          adminAddress: ADMIN_ADDRESS,
        }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });
  });

  describe('getBurnedNfts', () => {
    it('returns the list of burned token ids for an owner', async () => {
      const retval = xdr.ScVal.scvVec([
        xdr.ScVal.scvString('token-1'),
        xdr.ScVal.scvString('token-2'),
      ]);

      mockSimulateTransaction.mockResolvedValue({ result: { retval } });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(true);

      const result = await service.getBurnedNfts(OWNER_ADDRESS);

      expect(result).toEqual(['token-1', 'token-2']);
    });

    it('returns an empty array when simulation fails', async () => {
      mockSimulateTransaction.mockResolvedValue({ result: undefined });
      jest
        .spyOn(
          require('@stellar/stellar-sdk').SorobanRpc.Api,
          'isSimulationSuccess',
        )
        .mockReturnValue(false);

      const result = await service.getBurnedNfts(OWNER_ADDRESS);

      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Extended null-safety and operation coverage
// ---------------------------------------------------------------------------
describe('RentObligationNftService — extended transaction response checks', () => {
  let service: RentObligationNftService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'SOROBAN_RPC_URL') return 'http://localhost';
      if (key === 'RENT_OBLIGATION_CONTRACT_ID') return 'C_MOCK_CONTRACT_ID';
      if (key === 'STELLAR_ADMIN_SECRET_KEY') return 'SADMIN_SECRET';
      if (key === 'STELLAR_NETWORK') return defaultValue ?? 'testnet';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await require('@nestjs/testing').Test.createTestingModule({
      providers: [
        RentObligationNftService,
        { provide: require('@nestjs/config').ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get(RentObligationNftService);
    // Standard build-transaction setup
    mockGetAccount.mockResolvedValue({ sequenceNumber: () => '1' });
    mockSimulateTransaction.mockResolvedValue({ result: { retval: {} } });
    jest
      .spyOn(require('@stellar/stellar-sdk').SorobanRpc.Api, 'isSimulationError')
      .mockReturnValue(false);
  });

  // --- mintObligation ---
  describe('mintObligation', () => {
    it('returns txHash and obligationId on success', async () => {
      mockSendTransaction.mockResolvedValue({ hash: 'mint-hash', status: 'PENDING' });
      const result = await service.mintObligation({
        agreementId: 'AGR-EXT-001',
        adminAddress: ADMIN_ADDRESS,
      });
      expect(result.txHash).toBe('mint-hash');
      expect(result.obligationId).toBe('AGR-EXT-001');
    });

    it('throws BlockchainTransactionError when hash is null', async () => {
      mockSendTransaction.mockResolvedValue({ hash: null, status: 'PENDING' });
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-002', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws BlockchainTransactionError when entire response is null', async () => {
      mockSendTransaction.mockResolvedValue(null);
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-003', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws BlockchainTransactionError when entire response is undefined', async () => {
      mockSendTransaction.mockResolvedValue(undefined);
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-004', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('error message includes the operation name', async () => {
      mockSendTransaction.mockResolvedValue({ status: 'ERROR' });
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-005', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toThrow(/mint_obligation/);
    });

    it('accepts a hash even when status field is absent', async () => {
      mockSendTransaction.mockResolvedValue({ hash: 'hash-no-status' });
      const result = await service.mintObligation({
        agreementId: 'AGR-EXT-006',
        adminAddress: ADMIN_ADDRESS,
      });
      expect(result.txHash).toBe('hash-no-status');
    });

    it('throws on response that is an empty object {}', async () => {
      mockSendTransaction.mockResolvedValue({});
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-007', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws on response that contains only errorResult', async () => {
      mockSendTransaction.mockResolvedValue({ errorResult: { code: 'tx_failed' }, status: 'ERROR' });
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-008', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toBeInstanceOf(BlockchainTransactionError);
    });

    it('throws when sendTransaction rejects (network error)', async () => {
      mockSendTransaction.mockRejectedValue(new Error('network timeout'));
      await expect(
        service.mintObligation({ agreementId: 'AGR-EXT-009', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toThrow('network timeout');
    });

    it('accepts hash alongside errorResult (valid partial response)', async () => {
      mockSendTransaction.mockResolvedValue({
        hash: 'partial-hash',
        errorResult: { code: 'some_warning' },
        status: 'PENDING',
      });
      const result = await service.mintObligation({
        agreementId: 'AGR-EXT-010',
        adminAddress: ADMIN_ADDRESS,
      });
      expect(result.txHash).toBe('partial-hash');
    });
  });

  // --- transferObligation ---
  describe('transferObligation', () => {
    const TRANSFER_PARAMS = {
      agreementId: 'AGR-XFER-001',
      fromAddress: ADMIN_ADDRESS,
      toAddress: NEW_OWNER_ADDRESS,
    };

    it('returns txHash on success', async () => {
      mockSendTransaction.mockResolvedValue({ hash: 'xfer-hash', status: 'PENDING' });
      const result = await service.transferObligation(TRANSFER_PARAMS);
      expect(result.txHash).toBe('xfer-hash');
    });

    it('throws BlockchainTransactionError when hash is missing', async () => {
      mockSendTransaction.mockResolvedValue({ status: 'PENDING' });
      await expect(service.transferObligation(TRANSFER_PARAMS)).rejects.toBeInstanceOf(
        BlockchainTransactionError,
      );
    });

    it('throws BlockchainTransactionError when hash is null', async () => {
      mockSendTransaction.mockResolvedValue({ hash: null });
      await expect(service.transferObligation(TRANSFER_PARAMS)).rejects.toBeInstanceOf(
        BlockchainTransactionError,
      );
    });

    it('error message identifies transfer_obligation operation', async () => {
      mockSendTransaction.mockResolvedValue({ hash: null });
      await expect(service.transferObligation(TRANSFER_PARAMS)).rejects.toThrow(
        /transfer_obligation/,
      );
    });
  });

  // --- burnObligation extended ---
  describe('burnObligation extended', () => {
    const BURN_PARAMS = {
      tokenId: 'TOK-EXT-001',
      reason: 'lease_ended',
      ownerAddress: OWNER_ADDRESS,
    };

    it('error message identifies burn_nft operation', async () => {
      mockSendTransaction.mockResolvedValue({});
      await expect(service.burnObligation(BURN_PARAMS)).rejects.toThrow(/burn_nft/);
    });
  });

  // --- adminReassignObligation extended ---
  describe('adminReassignObligation extended', () => {
    const REASSIGN_PARAMS = {
      agreementId: 'AGR-REASSIGN-001',
      newOwnerAddress: NEW_OWNER_ADDRESS,
      adminAddress: ADMIN_ADDRESS,
    };

    it('throws BlockchainTransactionError when hash is empty string', async () => {
      mockSendTransaction.mockResolvedValue({ hash: '' });
      await expect(service.adminReassignObligation(REASSIGN_PARAMS)).rejects.toBeInstanceOf(
        BlockchainTransactionError,
      );
    });

    it('error message identifies admin_reassign_obligation operation', async () => {
      mockSendTransaction.mockResolvedValue({ hash: '' });
      await expect(service.adminReassignObligation(REASSIGN_PARAMS)).rejects.toThrow(
        /admin_reassign_obligation/,
      );
    });
  });

  // --- unconfigured contract ---
  describe('unconfigured contract', () => {
    let unconfiguredService: RentObligationNftService;

    beforeEach(async () => {
      const unconfiguredModule = await require('@nestjs/testing').Test.createTestingModule({
        providers: [
          RentObligationNftService,
          { provide: require('@nestjs/config').ConfigService, useValue: { get: jest.fn(() => '') } },
        ],
      }).compile();
      unconfiguredService = unconfiguredModule.get(RentObligationNftService);
    });

    it('mintObligation throws when contract not configured', async () => {
      await expect(
        unconfiguredService.mintObligation({ agreementId: 'X', adminAddress: ADMIN_ADDRESS }),
      ).rejects.toThrow('Contract not configured');
    });

    it('transferObligation throws when contract not configured', async () => {
      await expect(
        unconfiguredService.transferObligation({
          agreementId: 'X',
          fromAddress: ADMIN_ADDRESS,
          toAddress: NEW_OWNER_ADDRESS,
        }),
      ).rejects.toThrow('Contract not configured');
    });

    it('adminReassignObligation throws when contract not configured', async () => {
      await expect(
        unconfiguredService.adminReassignObligation({
          agreementId: 'X',
          newOwnerAddress: NEW_OWNER_ADDRESS,
          adminAddress: ADMIN_ADDRESS,
        }),
      ).rejects.toThrow('Contract not configured');
    });

    it('read-only queries return safe defaults when contract not configured', async () => {
      await expect(unconfiguredService.getObligationOwner('X')).resolves.toBeNull();
      await expect(unconfiguredService.getObligation('X')).resolves.toBeNull();
      await expect(unconfiguredService.hasObligation('X')).resolves.toBe(false);
      await expect(unconfiguredService.getObligationCount()).resolves.toBe(0);
      await expect(unconfiguredService.canBurn('T')).resolves.toBe(false);
      await expect(unconfiguredService.getBurnRecord('T')).resolves.toBeNull();
      await expect(unconfiguredService.getBurnedNfts(OWNER_ADDRESS)).resolves.toEqual([]);
    });
  });
});
