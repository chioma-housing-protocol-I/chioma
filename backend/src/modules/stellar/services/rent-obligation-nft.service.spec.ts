import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { xdr, Address } from '@stellar/stellar-sdk';
import { RentObligationNftService } from './rent-obligation-nft.service';

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
