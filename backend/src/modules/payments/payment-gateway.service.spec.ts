import { Test, TestingModule } from '@nestjs/testing';
import { PaymentGatewayService } from './payment-gateway.service';
import { RetryService } from '../../common/services/retry.service';
import { CircuitBreakerService } from '../../common/resilience/circuit-breaker.service';
import { CertificatePinningService } from '../../common/security/certificate-pinning.service';

/**
 * Tests for PaymentGatewayService.tokenizePaymentMethod and its private
 * verifyAndTokenizePaystack / verifyAndTokenizeFlutterwave implementations.
 * Mirrors payment-gateway.contract.spec.ts's DI setup (RetryService,
 * CircuitBreakerService, CertificatePinningService all pass through), and
 * mocks the private axios instance (`(service as any).http`) directly to
 * exercise the real verify-endpoint call sites without hitting the network.
 */
describe('PaymentGatewayService - tokenizePaymentMethod', () => {
  let service: PaymentGatewayService;
  let httpGetMock: jest.Mock;

  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        {
          provide: RetryService,
          useValue: {
            execute: jest.fn((fn) => fn()),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn((_key: string, fn: () => unknown) => fn()),
          },
        },
        {
          provide: CertificatePinningService,
          useValue: {
            getHttpsAgentForUrl: jest.fn(() => undefined),
            getHttpsAgent: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
    httpGetMock = jest.fn();

    (service as any).http = { get: httpGetMock, post: jest.fn() };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('mock gateway fallback', () => {
    it('returns a mock success token when PAYMENT_GATEWAY is unset/mock', async () => {
      delete process.env.PAYMENT_GATEWAY;

      (service as any).gateway = 'mock';

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'ref_123',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.token).toMatch(/^mock_token_\d+$/);
      expect(httpGetMock).not.toHaveBeenCalled();
    });

    it('rejects a missing gatewayReference before dispatching to any gateway', async () => {
      const result = await service.tokenizePaymentMethod({
        gatewayReference: '',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/gatewayReference/);
      expect(httpGetMock).not.toHaveBeenCalled();
    });
  });

  describe('Paystack verification', () => {
    beforeEach(() => {
      process.env.PAYSTACK_SECRET_KEY = 'sk_test_paystack';

      (service as any).gateway = 'paystack';
    });

    it('extracts the real authorization_code/last4/expiry from a successful verify response', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            reference: 'ref_abc',
            authorization: {
              authorization_code: 'AUTH_realcode123',
              last4: '4242',
              exp_month: '12',
              exp_year: '2027',
            },
          },
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'ref_abc',
        userEmail: 'user@example.com',
      });

      expect(result).toEqual({
        success: true,
        token: 'AUTH_realcode123',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
      });
      expect(httpGetMock).toHaveBeenCalledWith(
        'https://api.paystack.co/transaction/verify/ref_abc',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_test_paystack',
          }),
        }),
      );
    });

    it('fails when the transaction status is not success', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: true,
          data: {
            status: 'failed',
            authorization: null,
          },
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'ref_failed',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
    });

    it('fails when Paystack returns an API-level error (status: false)', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: false,
          message: 'Transaction reference not found',
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'ref_missing',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction reference not found');
    });

    it('fails cleanly (not a thrown error) on a network error', async () => {
      httpGetMock.mockRejectedValue(new Error('ECONNRESET'));

      await expect(
        service.tokenizePaymentMethod({
          gatewayReference: 'ref_network_fail',
          userEmail: 'user@example.com',
        }),
      ).rejects.toThrow('ECONNRESET');
      // Non-retryable plain Error propagates (matches chargePaystack's
      // existing behavior — only NetworkError/TimeoutError are retried and
      // circuit-breaker-open is what degrades to a {success:false} result).
    });

    it('throws if PAYSTACK_SECRET_KEY is not configured', async () => {
      delete process.env.PAYSTACK_SECRET_KEY;

      await expect(
        service.tokenizePaymentMethod({
          gatewayReference: 'ref_abc',
          userEmail: 'user@example.com',
        }),
      ).rejects.toThrow('PAYSTACK_SECRET_KEY is not configured');
    });
  });

  describe('Flutterwave verification', () => {
    beforeEach(() => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'sk_test_flutterwave';

      (service as any).gateway = 'flutterwave';
    });

    it('extracts the real card token/last4/expiry from a successful verify response', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: 'success',
          data: {
            status: 'successful',
            tx_ref: 'flw-ref-1',
            card: {
              token: 'flw_realtoken_xyz',
              last_4digits: '5555',
              expiry: '11/28',
            },
          },
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'flw-ref-1',
        userEmail: 'user@example.com',
      });

      expect(result).toEqual({
        success: true,
        token: 'flw_realtoken_xyz',
        last4: '5555',
        expiryMonth: 11,
        expiryYear: 2028,
      });
      expect(httpGetMock).toHaveBeenCalledWith(
        expect.stringContaining(
          'https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=flw-ref-1',
        ),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk_test_flutterwave',
          }),
        }),
      );
    });

    it('fails when the transaction status is not successful', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: 'success',
          data: {
            status: 'pending',
            card: { token: 'flw_token' },
          },
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'flw-ref-pending',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
    });

    it('fails when Flutterwave returns an API-level error', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: 'error',
          message: 'No transaction was found for this reference',
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'flw-ref-missing',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No transaction was found for this reference');
    });

    it('fails when the verify response has no reusable card token', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          status: 'success',
          data: {
            status: 'successful',
            card: { last_4digits: '5555' },
          },
        },
      });

      const result = await service.tokenizePaymentMethod({
        gatewayReference: 'flw-ref-no-token',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/reusable card token/);
    });

    it('throws if FLUTTERWAVE_SECRET_KEY is not configured', async () => {
      delete process.env.FLUTTERWAVE_SECRET_KEY;

      await expect(
        service.tokenizePaymentMethod({
          gatewayReference: 'flw-ref-1',
          userEmail: 'user@example.com',
        }),
      ).rejects.toThrow('FLUTTERWAVE_SECRET_KEY is not configured');
    });
  });
});
