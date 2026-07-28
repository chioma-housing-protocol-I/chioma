import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PaymentMethod } from './entities/payment-method.entity';
import { RetryService } from '../../common/services/retry.service';
import { NetworkError, TimeoutError } from '../../common/errors/retry-errors';
import {
  CircuitBreakerOpenError,
  CircuitBreakerService,
} from '../../common/resilience/circuit-breaker.service';
import { CertificatePinningService } from '../../common/security/certificate-pinning.service';

const GATEWAY_BREAKER_OPTIONS = {
  failureThreshold: 0.5,
  timeout: 30_000,
  windowSize: 10,
};

export type GatewayChargeResponse = {
  success: boolean;
  chargeId?: string;
  error?: string;
};

export type GatewayRefundResponse = {
  success: boolean;
  refundId?: string;
  error?: string;
};

export type GatewayChargeRequest = {
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  userEmail: string;
  decryptedMetadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
};

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly http: AxiosInstance;
  private readonly gateway: string;

  constructor(
    private readonly retryService: RetryService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly certificatePinningService: CertificatePinningService,
  ) {
    this.gateway = (process.env.PAYMENT_GATEWAY || 'mock').toLowerCase();
    this.http = axios.create({
      timeout: parseInt(process.env.PAYMENT_GATEWAY_TIMEOUT_MS || '10000'),
    });
  }

  async chargePayment(
    request: GatewayChargeRequest,
  ): Promise<GatewayChargeResponse> {
    const { paymentMethod, amount, currency, userEmail, decryptedMetadata } =
      request;
    this.logger.log(
      `Charging payment method ${paymentMethod.id} for ${amount} ${currency}`,
    );

    if (this.gateway === 'paystack') {
      return this.chargePaystack(
        paymentMethod,
        userEmail,
        amount,
        currency,
        decryptedMetadata,
      );
    }

    if (this.gateway === 'flutterwave') {
      return this.chargeFlutterwave(
        paymentMethod,
        userEmail,
        amount,
        currency,
        decryptedMetadata,
      );
    }

    return { success: true, chargeId: `charge_${Date.now()}` };
  }

  async processRefund(
    chargeId: string,
    amount: number,
  ): Promise<GatewayRefundResponse> {
    if (!chargeId || typeof chargeId !== 'string' || !chargeId.trim()) {
      throw new BadRequestException(
        'A valid chargeId is required to process a refund',
      );
    }

    this.logger.log(
      `Processing refund for charge ${chargeId} amount ${amount}`,
    );

    if (this.gateway === 'paystack') {
      return this.refundPaystack(chargeId, amount);
    }

    if (this.gateway === 'flutterwave') {
      return this.refundFlutterwave(chargeId, amount);
    }

    return { success: true, refundId: `refund_${Date.now()}` };
  }

  async savePaymentMethod(
    userId: string,
  ): Promise<{ success: boolean; methodId?: string; error?: string }> {
    // Placeholder for tokenization flows
    this.logger.log(`Saving payment method for user ${userId}`);
    return { success: true, methodId: `method_${Date.now()}` };
  }

  /**
   * Runs a gateway call through a circuit breaker so a struggling provider
   * fails fast for subsequent requests instead of piling up slow, doomed
   * calls. When the breaker is open we degrade to a normal gateway failure
   * response rather than surfacing an unhandled error.
   */
  private async executeGatewayCall<
    T extends { success: boolean; error?: string },
  >(breakerName: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await this.circuitBreaker.execute(
        breakerName,
        fn,
        GATEWAY_BREAKER_OPTIONS,
      );
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        this.logger.warn(
          `Circuit breaker open for ${breakerName}; failing fast`,
        );
        return {
          success: false,
          error:
            'Payment gateway is temporarily unavailable, please retry shortly',
        } as T;
      }
      throw error;
    }
  }

  private async chargePaystack(
    paymentMethod: PaymentMethod,
    userEmail: string,
    amount: number,
    currency: string,
    decryptedMetadata?: Record<string, unknown> | null,
  ): Promise<GatewayChargeResponse> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    const authorizationCode =
      (decryptedMetadata?.authorizationCode as string | undefined) ??
      (paymentMethod.metadata?.authorizationCode as string | undefined);

    if (!authorizationCode) {
      return { success: false, error: 'Missing Paystack authorization code' };
    }

    return this.executeGatewayCall('payment-gateway:paystack:charge', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.post(
            'https://api.paystack.co/transaction/charge_authorization',
            {
              email: userEmail,
              amount: Math.round(amount * 100),
              authorization_code: authorizationCode,
              currency,
            },
            {
              headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
              },
              httpsAgent: this.certificatePinningService.getHttpsAgent(
                'api.paystack.co',
              ),
            },
          );

          if (!response.data?.status) {
            return {
              success: false,
              error: response.data?.message || 'Paystack error',
            };
          }

          return {
            success: true,
            chargeId:
              response.data?.data?.reference || `paystack_${Date.now()}`,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.chargePaystack',
      ),
    );
  }

  private async chargeFlutterwave(
    paymentMethod: PaymentMethod,
    userEmail: string,
    amount: number,
    currency: string,
    decryptedMetadata?: Record<string, unknown> | null,
  ): Promise<GatewayChargeResponse> {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('FLUTTERWAVE_SECRET_KEY is not configured');
    }

    const token =
      (decryptedMetadata?.token as string | undefined) ??
      (paymentMethod.metadata?.token as string | undefined);

    if (!token) {
      return { success: false, error: 'Missing Flutterwave token' };
    }

    const txRef = `flw-${Date.now()}`;
    return this.executeGatewayCall('payment-gateway:flutterwave:charge', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.post(
            'https://api.flutterwave.com/v3/tokenized-charges',
            {
              token,
              currency,
              amount,
              email: userEmail,
              tx_ref: txRef,
            },
            {
              headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
              },
              httpsAgent: this.certificatePinningService.getHttpsAgent(
                'api.flutterwave.com',
              ),
            },
          );

          if (response.data?.status !== 'success') {
            return {
              success: false,
              error: response.data?.message || 'Flutterwave error',
            };
          }

          return {
            success: true,
            chargeId: response.data?.data?.id?.toString() || txRef,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.chargeFlutterwave',
      ),
    );
  }

  private async refundPaystack(
    chargeId: string,
    amount: number,
  ): Promise<GatewayRefundResponse> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    return this.executeGatewayCall('payment-gateway:paystack:refund', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.post(
            'https://api.paystack.co/refund',
            {
              transaction: chargeId,
              amount: Math.round(amount * 100),
            },
            {
              headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
              },
              httpsAgent: this.certificatePinningService.getHttpsAgent(
                'api.paystack.co',
              ),
            },
          );

          if (!response.data?.status) {
            return {
              success: false,
              error: response.data?.message || 'Paystack error',
            };
          }

          return {
            success: true,
            refundId: response.data?.data?.reference || `refund_${Date.now()}`,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.refundPaystack',
      ),
    );
  }

  private async refundFlutterwave(
    chargeId: string,
    amount: number,
  ): Promise<GatewayRefundResponse> {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('FLUTTERWAVE_SECRET_KEY is not configured');
    }

    return this.executeGatewayCall('payment-gateway:flutterwave:refund', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.post(
            'https://api.flutterwave.com/v3/refunds',
            {
              id: chargeId,
              amount,
            },
            {
              headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
              },
              httpsAgent: this.certificatePinningService.getHttpsAgent(
                'api.flutterwave.com',
              ),
            },
          );

          if (response.data?.status !== 'success') {
            return {
              success: false,
              error: response.data?.message || 'Flutterwave error',
            };
          }

          return {
            success: true,
            refundId:
              response.data?.data?.id?.toString() || `refund_${Date.now()}`,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.refundFlutterwave',
      ),
    );
  }
}
