import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  BlockchainQueueProcessor,
  BlockchainJobData,
} from './blockchain.processor';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';
import { EscrowIntegrationService } from '../../agreements/escrow-integration.service';
import { RentObligationNftService } from '../../stellar/services/rent-obligation-nft.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Bull Job stub with typed data. */
function makeJob(data: BlockchainJobData): Job<BlockchainJobData> {
  return { id: 'test-job-1', data } as Job<BlockchainJobData>;
}

/** A fake Keypair object returned by the mocked Keypair.fromSecret. */
const fakeKeypair = {
  publicKey: () => 'GFAKE_PUBLIC_KEY',
} as unknown as StellarSdk.Keypair;

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPaymentProcessingService = {
  processRentPayment: jest.fn(),
};

const mockEscrowIntegrationService = {
  createEscrowForAgreement: jest.fn(),
  approveEscrowRelease: jest.fn(),
};

const mockRentObligationNftService = {
  mintObligation: jest.fn(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('BlockchainQueueProcessor', () => {
  let processor: BlockchainQueueProcessor;

  /** Spy on Keypair.fromSecret so tests never touch the real SDK validation. */
  let fromSecretSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Intercept Keypair.fromSecret before the module is created
    fromSecretSpy = jest
      .spyOn(StellarSdk.Keypair, 'fromSecret')
      .mockReturnValue(fakeKeypair);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainQueueProcessor,
        {
          provide: PaymentProcessingService,
          useValue: mockPaymentProcessingService,
        },
        {
          provide: EscrowIntegrationService,
          useValue: mockEscrowIntegrationService,
        },
        {
          provide: RentObligationNftService,
          useValue: mockRentObligationNftService,
        },
      ],
    }).compile();

    processor = module.get<BlockchainQueueProcessor>(BlockchainQueueProcessor);
  });

  afterEach(() => {
    fromSecretSpy.mockRestore();
  });
  // -------------------------------------------------------------------------
  // send-payment
  // -------------------------------------------------------------------------

  describe('send-payment', () => {
    const validPayload: BlockchainJobData = {
      type: 'send-payment',
      data: {
        from: 'GABC1234SENDER',
        agreementId: 'agreement-uuid-001',
        amount: '1000000',
        // Any non-empty string — Keypair.fromSecret is mocked in beforeEach
        callerSecret: 'ANY_SECRET_MOCKED_OUT',
      },
    };

    it('calls PaymentProcessingService.processRentPayment with correct args', async () => {
      mockPaymentProcessingService.processRentPayment.mockResolvedValue(
        'tx-hash-abc',
      );

      await processor.handleBlockchainJob(makeJob(validPayload));

      // Verify Keypair was reconstructed from the secret in the payload
      expect(fromSecretSpy).toHaveBeenCalledWith('ANY_SECRET_MOCKED_OUT');

      expect(
        mockPaymentProcessingService.processRentPayment,
      ).toHaveBeenCalledTimes(1);
      const [from, agreementId, amount, keypair] =
        mockPaymentProcessingService.processRentPayment.mock.calls[0];
      expect(from).toBe('GABC1234SENDER');
      expect(agreementId).toBe('agreement-uuid-001');
      expect(amount).toBe('1000000');
      // Verify the mocked keypair (not the real SDK object) was passed through
      expect(keypair).toBe(fakeKeypair);
    });

    it('surfaces PaymentProcessingService errors as job failures', async () => {
      mockPaymentProcessingService.processRentPayment.mockRejectedValue(
        new Error('Stellar network timeout'),
      );

      await expect(
        processor.handleBlockchainJob(makeJob(validPayload)),
      ).rejects.toThrow('Stellar network timeout');
    });

    it('throws when required send-payment fields are missing', async () => {
      const badJob = makeJob({
        type: 'send-payment',
        data: { from: 'GABC', agreementId: 'ag-1' } as any, // missing amount + callerSecret
      });

      await expect(processor.handleBlockchainJob(badJob)).rejects.toThrow(
        'send-payment job requires',
      );
      expect(
        mockPaymentProcessingService.processRentPayment,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // create-escrow
  // -------------------------------------------------------------------------

  describe('create-escrow', () => {
    const validPayload: BlockchainJobData = {
      type: 'create-escrow',
      data: { agreementId: 'agreement-uuid-002' },
    };

    it('calls EscrowIntegrationService.createEscrowForAgreement with the correct agreementId', async () => {
      mockEscrowIntegrationService.createEscrowForAgreement.mockResolvedValue({
        id: 7,
        blockchainEscrowId: 'escrow-tx-hash',
      });

      await processor.handleBlockchainJob(makeJob(validPayload));

      expect(
        mockEscrowIntegrationService.createEscrowForAgreement,
      ).toHaveBeenCalledWith('agreement-uuid-002');
    });

    it('surfaces EscrowIntegrationService errors as job failures', async () => {
      mockEscrowIntegrationService.createEscrowForAgreement.mockRejectedValue(
        new Error('Agreement not found'),
      );

      await expect(
        processor.handleBlockchainJob(makeJob(validPayload)),
      ).rejects.toThrow('Agreement not found');
    });

    it('throws when agreementId is missing', async () => {
      const badJob = makeJob({ type: 'create-escrow', data: {} as any });

      await expect(processor.handleBlockchainJob(badJob)).rejects.toThrow(
        'create-escrow job requires data.agreementId',
      );
      expect(
        mockEscrowIntegrationService.createEscrowForAgreement,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // release-escrow
  // -------------------------------------------------------------------------

  describe('release-escrow', () => {
    const validPayload: BlockchainJobData = {
      type: 'release-escrow',
      data: { escrowId: 42, releaseTo: 'GBENEFICIARY123' },
    };

    it('calls EscrowIntegrationService.approveEscrowRelease with the correct escrowId and releaseTo', async () => {
      mockEscrowIntegrationService.approveEscrowRelease.mockResolvedValue(
        undefined,
      );

      await processor.handleBlockchainJob(makeJob(validPayload));

      expect(
        mockEscrowIntegrationService.approveEscrowRelease,
      ).toHaveBeenCalledWith(42, 'GBENEFICIARY123');
    });

    it('surfaces EscrowIntegrationService errors as job failures', async () => {
      mockEscrowIntegrationService.approveEscrowRelease.mockRejectedValue(
        new Error('Escrow not found or not on-chain'),
      );

      await expect(
        processor.handleBlockchainJob(makeJob(validPayload)),
      ).rejects.toThrow('Escrow not found or not on-chain');
    });

    it('throws when escrowId or releaseTo is missing', async () => {
      const badJob = makeJob({
        type: 'release-escrow',
        data: { escrowId: 42 } as any, // missing releaseTo
      });

      await expect(processor.handleBlockchainJob(badJob)).rejects.toThrow(
        'release-escrow job requires data.escrowId and data.releaseTo',
      );
      expect(
        mockEscrowIntegrationService.approveEscrowRelease,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // mint-nft
  // -------------------------------------------------------------------------

  describe('mint-nft', () => {
    const validPayload: BlockchainJobData = {
      type: 'mint-nft',
      data: {
        agreementId: 'agreement-uuid-003',
        adminAddress: 'GADMINADDRESS456',
      },
    };

    it('calls RentObligationNftService.mintObligation with the correct params', async () => {
      mockRentObligationNftService.mintObligation.mockResolvedValue({
        txHash: 'nft-tx-hash',
        obligationId: 'agreement-uuid-003',
      });

      await processor.handleBlockchainJob(makeJob(validPayload));

      expect(mockRentObligationNftService.mintObligation).toHaveBeenCalledWith({
        agreementId: 'agreement-uuid-003',
        adminAddress: 'GADMINADDRESS456',
      });
    });

    it('surfaces RentObligationNftService errors as job failures', async () => {
      mockRentObligationNftService.mintObligation.mockRejectedValue(
        new Error('Contract not configured'),
      );

      await expect(
        processor.handleBlockchainJob(makeJob(validPayload)),
      ).rejects.toThrow('Contract not configured');
    });

    it('throws when agreementId or adminAddress is missing', async () => {
      const badJob = makeJob({
        type: 'mint-nft',
        data: { agreementId: 'ag-1' } as any, // missing adminAddress
      });

      await expect(processor.handleBlockchainJob(badJob)).rejects.toThrow(
        'mint-nft job requires data.agreementId and data.adminAddress',
      );
      expect(
        mockRentObligationNftService.mintObligation,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Unknown job type
  // -------------------------------------------------------------------------

  it('throws for an unknown job type', async () => {
    const badJob = makeJob({ type: 'unknown-type' as any, data: {} });

    await expect(processor.handleBlockchainJob(badJob)).rejects.toThrow(
      'Unknown blockchain type: unknown-type',
    );
  });
});
