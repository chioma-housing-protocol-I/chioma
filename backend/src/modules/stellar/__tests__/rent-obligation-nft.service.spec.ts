import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanRpc } from '@stellar/stellar-sdk';
import {
  RentObligationNftService,
  MintObligationParams,
  TransferObligationParams,
  BurnObligationParams,
  AdminReassignObligationParams,
} from '../services/rent-obligation-nft.service';
import { BlockchainTransactionError } from '../../../common/errors';

// ── Stellar SDK mock ──────────────────────────────────────────────────────────

const mockAssembledTx = { sign: jest.fn() };
const mockSendTransaction = jest.fn();
const mockGetAccount = jest.fn();
const mockSimulateTransaction = jest.fn();

jest.mock('@stellar/stellar-sdk', () => {
  const assembleTransaction = jest.fn(() => ({
    build: () => mockAssembledTx,
  }));

  return {
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn(() => ({})),
    })),
    Address: jest.fn().mockImplementation(() => ({
      toScVal: jest.fn(() => ({})),
    })),
    xdr: {
      ScVal: {
        scvString: jest.fn(() => ({})),
      },
    },
    SorobanRpc: {
      Server: jest.fn().mockImplementation(() => ({
        sendTransaction: mockSendTransaction,
        getAccount: mockGetAccount,
        simulateTransaction: mockSimulateTransaction,
      })),
      Api: {
        isSimulationError: jest.fn(() => false),
        isSimulationSuccess: jest.fn(() => false),
      },
      assembleTransaction,
    },
    Keypair: {
      fromSecret: jest.fn(() => ({
        publicKey: () => 'GADMIN_PUBLIC_KEY_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAA',
      })),
    },
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
    Account: jest.fn().mockImplementation(() => ({})),
    BASE_FEE: '100',
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a partial SendTransactionResponse. Omitting `hash` simulates
 * the incomplete-response case described in #1806.
 */
function makeSendResponse(
  overrides: Partial<SorobanRpc.Api.SendTransactionResponse> = {},
): SorobanRpc.Api.SendTransactionResponse {
  return {
    status: 'PENDING',
    hash: 'abc123txhash',
    latestLedger: 1000,
    latestLedgerCloseTime: 1700000000,
    ...overrides,
  } as SorobanRpc.Api.SendTransactionResponse;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('RentObligationNftService – transaction response null checks', () => {
  let service: RentObligationNftService;

  const mockConfigService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const config: Record<string, string> = {
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        RENT_OBLIGATION_CONTRACT_ID: 'CCONTRACT_ID_PLACEHOLDER',
        STELLAR_ADMIN_SECRET_KEY: 'SADMIN_SECRET_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAA',
        STELLAR_NETWORK: 'testnet',
      };
      return config[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: getAccount resolves so buildTransaction doesn't throw first
    mockGetAccount.mockResolvedValue({});
    // Default: simulation is not an error
    (SorobanRpc.Api.isSimulationError as jest.Mock).mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentObligationNftService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RentObligationNftService>(RentObligationNftService);
  });

  // ── mintObligation ─────────────────────────────────────────────────────────

  describe('mintObligation', () => {
    const params: MintObligationParams = {
      agreementId: 'AGR-001',
      adminAddress: 'GADMIN_PUBLIC_KEY_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    it('returns txHash when response contains a valid hash', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: 'mint-tx-hash' }));

      const result = await service.mintObligation(params);

      expect(result.txHash).toBe('mint-tx-hash');
      expect(result.obligationId).toBe('AGR-001');
    });

    it('throws BlockchainTransactionError when hash is missing', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.mintObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });

    it('includes the operation label and response status in the error message', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string, status: 'ERROR' }),
      );

      await expect(service.mintObligation(params)).rejects.toThrow(
        /mint_obligation\(AGR-001\)/,
      );
    });

    it('throws BlockchainTransactionError when hash is an empty string', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: '' }));

      await expect(service.mintObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });

    it('throws BlockchainTransactionError when sendTransaction returns null', async () => {
      // Soroban returning a completely null body is the most extreme edge case
      mockSendTransaction.mockResolvedValue(null as unknown as SorobanRpc.Api.SendTransactionResponse);

      await expect(service.mintObligation(params)).rejects.toThrow();
    });
  });

  // ── transferObligation ─────────────────────────────────────────────────────

  describe('transferObligation', () => {
    const params: TransferObligationParams = {
      agreementId: 'AGR-002',
      fromAddress: 'GFROM_ADDRESS_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAAAA',
      toAddress: 'GTO_ADDRESS_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    it('returns txHash when response contains a valid hash', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: 'transfer-tx-hash' }));

      const result = await service.transferObligation(params);

      expect(result.txHash).toBe('transfer-tx-hash');
    });

    it('throws BlockchainTransactionError when hash is missing', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.transferObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });

    it('includes the operation label in the error message', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.transferObligation(params)).rejects.toThrow(
        /transfer_obligation\(AGR-002\)/,
      );
    });
  });

  // ── burnObligation ─────────────────────────────────────────────────────────

  describe('burnObligation', () => {
    const params: BurnObligationParams = {
      tokenId: 'TOKEN-123',
      reason: 'lease_terminated',
      ownerAddress: 'GOWNER_ADDRESS_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    it('returns txHash when response contains a valid hash', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: 'burn-tx-hash' }));

      const result = await service.burnObligation(params);

      expect(result.txHash).toBe('burn-tx-hash');
    });

    it('throws BlockchainTransactionError when hash is missing', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.burnObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });

    it('includes the operation label in the error message', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.burnObligation(params)).rejects.toThrow(
        /burn_nft\(TOKEN-123\)/,
      );
    });

    it('throws BlockchainTransactionError when hash is an empty string', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: '' }));

      await expect(service.burnObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });
  });

  // ── adminReassignObligation ────────────────────────────────────────────────

  describe('adminReassignObligation', () => {
    const params: AdminReassignObligationParams = {
      agreementId: 'AGR-003',
      newOwnerAddress: 'GNEWOWNER_ADDRESS_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAA',
      adminAddress: 'GADMIN_PUBLIC_KEY_PLACEHOLDER_AAAAAAAAAAAAAAAAAAAAAAAAA',
    };

    it('returns txHash when response contains a valid hash', async () => {
      mockSendTransaction.mockResolvedValue(makeSendResponse({ hash: 'reassign-tx-hash' }));

      const result = await service.adminReassignObligation(params);

      expect(result.txHash).toBe('reassign-tx-hash');
    });

    it('throws BlockchainTransactionError when hash is missing', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.adminReassignObligation(params)).rejects.toThrow(
        BlockchainTransactionError,
      );
    });

    it('includes the operation label in the error message', async () => {
      mockSendTransaction.mockResolvedValue(
        makeSendResponse({ hash: undefined as unknown as string }),
      );

      await expect(service.adminReassignObligation(params)).rejects.toThrow(
        /admin_reassign_obligation\(AGR-003\)/,
      );
    });
  });

  // ── extractTransactionHash (contract-not-configured guard) ─────────────────

  describe('when contract is not configured', () => {
    let unconfiguredService: RentObligationNftService;

    beforeEach(async () => {
      const unconfiguredConfig = {
        get: jest.fn((key: string, fallback?: unknown) => {
          // Omit RENT_OBLIGATION_CONTRACT_ID so isConfigured === false
          const config: Record<string, string> = {
            SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
            STELLAR_NETWORK: 'testnet',
          };
          return config[key] ?? fallback;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RentObligationNftService,
          { provide: ConfigService, useValue: unconfiguredConfig },
        ],
      }).compile();

      unconfiguredService = module.get<RentObligationNftService>(
        RentObligationNftService,
      );
    });

    it('throws "Contract not configured" for mintObligation', async () => {
      await expect(
        unconfiguredService.mintObligation({
          agreementId: 'X',
          adminAddress: 'GADMIN',
        }),
      ).rejects.toThrow('Contract not configured');
    });

    it('throws "Contract not configured" for burnObligation', async () => {
      await expect(
        unconfiguredService.burnObligation({
          tokenId: 'T',
          reason: 'test',
          ownerAddress: 'GOWNER',
        }),
      ).rejects.toThrow('Contract not configured');
    });
  });
});
