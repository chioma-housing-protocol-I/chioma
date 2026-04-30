import { Test, TestingModule } from '@nestjs/testing';
import {
  PaymentGatewayService,
  GatewayChargeResponse,
  GatewayRefundResponse,
} from './payment-gateway.service';
import { RetryService } from '../../common/services/retry.service';
import { PaymentMethod } from './entities/payment-method.entity';

/**
 * Contract Tests for Payment Gateway Integration
 *
 * These tests verify that the PaymentGatewayService adheres to its contract
 * and properly integrates with external payment providers (Paystack, Flutterwave).
 */
describe('PaymentGatewayService - Contract Tests', () => {
  let service: PaymentGatewayService;
  let retryService: RetryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentGatewayService,
        {
          provide: RetryService,
          useValue: {
            execute: jest.fn((fn) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentGatewayService>(PaymentGatewayService);
    retryService = module.get<RetryService>(RetryService);
  });

  describe('Contract: chargePayment', () => {
    it('should return a response conforming to GatewayChargeResponse contract', async () => {
      const mockUser = { id: 'user_123' } as any;
      const mockPaymentMethod: PaymentMethod = {
        id: 1,
        user: mockUser,
        userId: 'user_123',
        paymentType: 'CREDIT_CARD',
        lastFour: '4242',
        expiryDate: new Date('2025-12-31'),
        isDefault: true,
        encryptedMetadata: null,
        metadata: { authorizationCode: 'AUTH_code123' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PaymentMethod;

      const result: GatewayChargeResponse = await service.chargePayment({
        paymentMethod: mockPaymentMethod,
        amount: 100.0,
        currency: 'USD',
        userEmail: 'test@example.com',
        decryptedMetadata: null,
        idempotencyKey: null,
      });

      // Contract validation: Response must have success field
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      // Contract validation: If successful, must have chargeId
      if (result.success) {
        expect(result).toHaveProperty('chargeId');
        expect(typeof result.chargeId).toBe('string');
        expect(result.chargeId).toBeTruthy();
      }

      // Contract validation: If failed, must have error message
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle payment method with required metadata fields', async () => {
      const mockUser = { id: 'user_456' } as any;
      const mockPaymentMethod: PaymentMethod = {
        id: 2,
        user: mockUser,
        userId: 'user_456',
        paymentType: 'CREDIT_CARD',
        lastFour: '5555',
        expiryDate: new Date('2026-06-30'),
        isDefault: false,
        encryptedMetadata: null,
        metadata: { token: 'flw_token_xyz' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PaymentMethod;

      const result = await service.chargePayment({
        paymentMethod: mockPaymentMethod,
        amount: 250.5,
        currency: 'NGN',
        userEmail: 'user@test.com',
        decryptedMetadata: { token: 'flw_token_xyz' },
        idempotencyKey: 'idem_key_123',
      });

      // Contract: Must return valid response structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');

      // Contract: Response type must match GatewayChargeResponse
      const validKeys = ['success', 'chargeId', 'error'];
      Object.keys(result).forEach((key) => {
        expect(validKeys).toContain(key);
      });
    });
  });

  describe('Contract: processRefund', () => {
    it('should return a response conforming to GatewayRefundResponse contract', async () => {
      const chargeId = 'charge_abc123';
      const refundAmount = 50.0;

      const result: GatewayRefundResponse = await service.processRefund(
        chargeId,
        refundAmount,
      );

      // Contract validation: Response must have success field
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');

      // Contract validation: If successful, must have refundId
      if (result.success) {
        expect(result).toHaveProperty('refundId');
        expect(typeof result.refundId).toBe('string');
        expect(result.refundId).toBeTruthy();
      }

      // Contract validation: If failed, must have error message
      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should accept valid charge ID and amount parameters', async () => {
      const testCases = [
        { chargeId: 'ch_paystack_123', amount: 100 },
        { chargeId: 'flw_12345', amount: 0.01 },
      ];

      for (const testCase of testCases) {
        const result = await service.processRefund(
          testCase.chargeId,
          testCase.amount,
        );

        // Contract: Must handle various charge ID formats
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();

        // Contract: Response structure must be consistent
        const validKeys = ['success', 'refundId', 'error'];
        Object.keys(result).forEach((key) => {
          expect(validKeys).toContain(key);
        });
      }
    });
  });
});
