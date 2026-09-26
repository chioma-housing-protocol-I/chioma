import { Test, TestingModule } from '@nestjs/testing';
import { FraudHooksService } from './fraud-hooks.service';
import { FraudService } from './fraud.service';
import { FraudBlockedException } from './exceptions/fraud-blocked.exception';

describe('FraudHooksService', () => {
  const fraudService = {
    checkTransactionFraud: jest.fn(),
    checkListingFraud: jest.fn(),
  };

  let service: FraudHooksService;

  const allowResult = {
    score: 10,
    decision: 'allow' as const,
    reasons: [],
    features: {},
    modelVersion: 'v1',
  };

  const reviewResult = {
    score: 55,
    decision: 'review' as const,
    reasons: ['failedLoginAttempts'],
    features: { failedLoginAttempts: 0.9 },
    modelVersion: 'v1',
  };

  const blockResult = {
    score: 85,
    decision: 'block' as const,
    reasons: ['suspiciousLocation', 'velocityAnomaly'],
    features: { suspiciousLocation: 0.95, velocityAnomaly: 0.88 },
    modelVersion: 'v1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.FRAUD_HOOKS_ENABLED;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudHooksService,
        { provide: FraudService, useValue: fraudService },
      ],
    }).compile();

    service = module.get(FraudHooksService);
  });

  describe('Post-checks (onPaymentRecorded, onListingPublished)', () => {
    it('skips checks when FRAUD_HOOKS_ENABLED is false', async () => {
      process.env.FRAUD_HOOKS_ENABLED = 'false';
      await service.onPaymentRecorded({
        userId: 'u1',
        amount: 100,
      });
      await service.onListingPublished('p1');
      expect(fraudService.checkTransactionFraud).not.toHaveBeenCalled();
      expect(fraudService.checkListingFraud).not.toHaveBeenCalled();
    });

    it('runs transaction check when enabled', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(allowResult);
      await service.onPaymentRecorded({
        userId: 'u1',
        amount: 50,
        currency: 'USD',
        paymentMethod: 'card',
      });
      expect(fraudService.checkTransactionFraud).toHaveBeenCalledWith({
        userId: 'u1',
        amount: 50,
        currency: 'USD',
        paymentMethod: 'card',
      });
    });

    it('swallows errors from FraudService on post-check', async () => {
      fraudService.checkListingFraud.mockRejectedValueOnce(
        new Error('db down'),
      );
      await expect(service.onListingPublished('p1')).resolves.toBeUndefined();
    });

    it('does not throw on block decision in post-check', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(blockResult);
      await expect(
        service.onPaymentRecorded({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('Pre-checks (checkTransactionBeforeRecording)', () => {
    it('allows payment when decision is allow', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(allowResult);
      await expect(
        service.checkTransactionBeforeRecording({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
          paymentMethod: 'card',
        }),
      ).resolves.toBeUndefined();
    });

    it('allows payment when decision is review', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(reviewResult);
      await expect(
        service.checkTransactionBeforeRecording({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
        }),
      ).resolves.toBeUndefined();
    });

    it('throws FraudBlockedException when transaction decision is block', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(blockResult);
      await expect(
        service.checkTransactionBeforeRecording({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
          paymentMethod: 'card',
        }),
      ).rejects.toBeInstanceOf(FraudBlockedException);
    });

    it('provides blocked transaction details in exception', async () => {
      fraudService.checkTransactionFraud.mockResolvedValueOnce(blockResult);
      try {
        await service.checkTransactionBeforeRecording({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
        });
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FraudBlockedException);
        expect(err.fraudResult).toEqual(blockResult);
        expect(err.subjectType).toBe('transaction');
        expect(err.subjectId).toBe('u1');
      }
    });

    it('swallows non-block errors from FraudService pre-check', async () => {
      fraudService.checkTransactionFraud.mockRejectedValueOnce(
        new Error('db error'),
      );
      await expect(
        service.checkTransactionBeforeRecording({
          userId: 'u1',
          amount: 100,
          currency: 'NGN',
        }),
      ).resolves.toBeUndefined();
    });

    it('skips pre-check when FRAUD_HOOKS_ENABLED is false', async () => {
      process.env.FRAUD_HOOKS_ENABLED = 'false';
      await service.checkTransactionBeforeRecording({
        userId: 'u1',
        amount: 100,
      });
      expect(fraudService.checkTransactionFraud).not.toHaveBeenCalled();
    });
  });

  describe('Pre-checks (checkListingBeforePublishing)', () => {
    it('allows listing when decision is allow', async () => {
      fraudService.checkListingFraud.mockResolvedValueOnce(allowResult);
      await expect(
        service.checkListingBeforePublishing('listing-1'),
      ).resolves.toBeUndefined();
    });

    it('allows listing when decision is review', async () => {
      fraudService.checkListingFraud.mockResolvedValueOnce(reviewResult);
      await expect(
        service.checkListingBeforePublishing('listing-1'),
      ).resolves.toBeUndefined();
    });

    it('throws FraudBlockedException when listing decision is block', async () => {
      fraudService.checkListingFraud.mockResolvedValueOnce(blockResult);
      await expect(
        service.checkListingBeforePublishing('listing-1'),
      ).rejects.toBeInstanceOf(FraudBlockedException);
    });

    it('provides blocked listing details in exception', async () => {
      fraudService.checkListingFraud.mockResolvedValueOnce(blockResult);
      try {
        await service.checkListingBeforePublishing('listing-1');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(FraudBlockedException);
        expect(err.fraudResult).toEqual(blockResult);
        expect(err.subjectType).toBe('listing');
        expect(err.subjectId).toBe('listing-1');
      }
    });

    it('swallows non-block errors from FraudService pre-check', async () => {
      fraudService.checkListingFraud.mockRejectedValueOnce(
        new Error('db error'),
      );
      await expect(
        service.checkListingBeforePublishing('listing-1'),
      ).resolves.toBeUndefined();
    });

    it('skips pre-check when FRAUD_HOOKS_ENABLED is false', async () => {
      process.env.FRAUD_HOOKS_ENABLED = 'false';
      await service.checkListingBeforePublishing('listing-1');
      expect(fraudService.checkListingFraud).not.toHaveBeenCalled();
    });
  });
});
