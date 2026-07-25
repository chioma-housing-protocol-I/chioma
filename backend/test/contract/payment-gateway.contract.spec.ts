import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentGatewayService,
  GatewayChargeResponse,
} from '../../src/modules/payments/payment-gateway.service';
import * as nock from 'nock';
import { matchers } from 'jest-json-schema';
import 'jest-json-schema';
import { RetryService } from '../../src/common/services/retry.service';
import { PaymentMethod } from '../../src/modules/payments/entities/payment-method.entity';

expect.extend(matchers);

describe('Payment Gateway Provider Contract (Nock + JSON Schema)', () => {
  let service: PaymentGatewayService;
  const mockPaystackUrl = 'https://api.paystack.co';
  const mockFlutterwaveUrl = 'https://api.flutterwave.com/v3';

  const mockRetryService = {
    execute: jest.fn((fn) => fn()),
  };

  const chargeResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      chargeId: { type: 'string' },
      error: { type: 'string' },
    },
    required: ['success'],
  };

  beforeAll(async () => {
    process.env.PAYMENT_GATEWAY = 'paystack';
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-key';
    process.env.FLUTTERWAVE_SECRET_KEY = 'test-flutterwave-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        { provide: RetryService, useValue: mockRetryService },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Paystack Contract', () => {
    beforeEach(() => {
      process.env.PAYMENT_GATEWAY = 'paystack';
    });

    it('should adhere to Paystack contract for charging payment', async () => {
      const mockPaymentMethod = {
        id: 1,
        metadata: { authorizationCode: 'AUTH_123' },
      } as unknown as PaymentMethod;

      const providerResponse = {
        status: true,
        data: {
          reference: 'pstk_ref_123',
          status: 'success',
        },
      };

      nock(mockPaystackUrl)
        .post('/transaction/charge_authorization')
        .reply(200, (uri, requestBody: any) => {
          // Verify Consumer Contract (what we send to Paystack)
          expect(requestBody).toMatchObject({
            authorization_code: 'AUTH_123',
            email: 'test@example.com',
            amount: 10000, // 100.00 * 100
          });
          return providerResponse;
        });

      const result = await service.chargePayment({
        paymentMethod: mockPaymentMethod,
        amount: 100.0,
        currency: 'NGN',
        userEmail: 'test@example.com',
      });

      // Verify Provider Contract (what we expect from Paystack, mapped to our internal response)
      expect(result).toMatchSchema(chargeResponseSchema);
      expect(result.success).toBe(true);
      expect(result.chargeId).toBe('pstk_ref_123');
    });
  });

  describe('Flutterwave Contract', () => {
    beforeEach(() => {
      // We need to re-initialize or change internal state if possible
      // Since gateway is set in constructor, we might need a new service instance
    });

    it('should adhere to Flutterwave contract for charging payment', async () => {
      // Re-instantiate service for Flutterwave
      process.env.PAYMENT_GATEWAY = 'flutterwave';
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentGatewayService,
          { provide: RetryService, useValue: mockRetryService },
        ],
      }).compile();
      const flwService = module.get<PaymentGatewayService>(
        PaymentGatewayService,
      );

      const mockPaymentMethod = {
        id: 2,
        metadata: { token: 'flw_token_123' },
      } as unknown as PaymentMethod;

      const providerResponse = {
        status: 'success',
        data: {
          id: 999,
          tx_ref: 'flw_ref_456',
        },
      };

      nock(mockFlutterwaveUrl)
        .post('/tokenized-charges')
        .reply(200, (uri, requestBody: any) => {
          // Verify Consumer Contract
          expect(requestBody).toMatchObject({
            token: 'flw_token_123',
            email: 'test@example.com',
            amount: 150.5,
          });
          return providerResponse;
        });

      const result = await flwService.chargePayment({
        paymentMethod: mockPaymentMethod,
        amount: 150.5,
        currency: 'NGN',
        userEmail: 'test@example.com',
      });

      expect(result).toMatchSchema(chargeResponseSchema);
      expect(result.success).toBe(true);
      expect(result.chargeId).toBe('999');
    });
  });
});
