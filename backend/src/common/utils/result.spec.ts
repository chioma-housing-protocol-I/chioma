import { BadRequestException } from '@nestjs/common';
import { err, ok, unwrap } from './result';
import { FxRateService } from '../../modules/payments/fx-rate.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { UsersService } from '../../modules/users/users.service';

describe('Result/Either pattern (#2174)', () => {
  it('models success and failure without throwing', () => {
    const success = ok(42);
    const failure = err(new BadRequestException('bad input'));

    expect(success.ok).toBe(true);
    expect(success.isOk()).toBe(true);
    expect(success.value).toBe(42);
    expect(failure.ok).toBe(false);
    expect(failure.isErr()).toBe(true);
    expect(() => unwrap(failure)).toThrow(BadRequestException);
  });

  it('migrates FxRateService currency validation to Result', async () => {
    const service = Object.create(FxRateService.prototype) as {
      supportedCurrencyRepo: { findOne: jest.Mock };
      validateCurrency: (code: string) => Promise<{
        ok: boolean;
        value?: string;
        error?: Error;
      }>;
    };
    service.supportedCurrencyRepo = {
      findOne: jest.fn().mockResolvedValue({ code: 'USD' }),
    };

    const valid = await service.validateCurrency('USD');
    expect(valid.ok).toBe(true);
    expect(valid.value).toBe('USD');

    service.supportedCurrencyRepo.findOne.mockResolvedValue(null);
    const invalid = await service.validateCurrency('XYZ');
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBeInstanceOf(BadRequestException);
  });

  it('migrates UsersService lookup to Result', async () => {
    const service = Object.create(UsersService.prototype) as {
      userRepository: { findOne: jest.Mock };
      findById: (id: string) => Promise<{ ok: boolean; value?: unknown }>;
    };
    service.userRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'user_1' }),
    };

    const found = await service.findById('user_1');
    expect(found.ok).toBe(true);
    expect(found.value).toEqual({ id: 'user_1' });
  });

  it('migrates NotificationsService retry delivery to Result', async () => {
    const service = Object.create(NotificationsService.prototype) as {
      retryService: { execute: jest.Mock };
      deliverWithRetry: (
        channel: string,
        payload: Record<string, unknown>,
        fn: () => Promise<string>,
      ) => Promise<{ ok: boolean; value?: string; error?: Error }>;
    };
    service.retryService = {
      execute: jest.fn().mockResolvedValue('delivered'),
    };

    const delivered = await service.deliverWithRetry(
      'persist',
      {},
      async () => 'delivered',
    );

    expect(delivered.ok).toBe(true);
    expect(delivered.value).toBe('delivered');
  });
});
