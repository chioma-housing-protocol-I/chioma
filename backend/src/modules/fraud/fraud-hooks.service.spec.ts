import { Test, TestingModule } from '@nestjs/testing';
import { FraudHooksService } from './fraud-hooks.service';
import { FraudService } from './fraud.service';

describe('FraudHooksService', () => {
  const fraudService = {
    checkTransactionFraud: jest.fn(),
    checkListingFraud: jest.fn(),
  };

  let service: FraudHooksService;

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

  it('swallows errors from FraudService', async () => {
    fraudService.checkListingFraud.mockRejectedValueOnce(new Error('db down'));
    await expect(service.onListingPublished('p1')).resolves.toBeUndefined();
  });
});
