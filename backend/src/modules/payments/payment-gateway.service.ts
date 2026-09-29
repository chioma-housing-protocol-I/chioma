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

export type TokenizePaymentMethodRequest = {
  gatewayReference: string;
  userEmail: string;
};

export type TokenizePaymentMethodResponse = {
  success: boolean;
  token?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
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

  /**
   * Tokenizes a saved payment method by verifying a client-supplied gateway
   * reference against the real gateway (Paystack/Flutterwave), rather than
   * trusting anything the client claims about the card. The client must have
   * already collected card details and completed a charge/tokenize step
   * client-side via the gateway's own SDK (PCI-DSS requires raw card data
   * never touch this backend); this method's job is to re-fetch the
   * authoritative result server-side from the gateway using the reference
   * and return only gateway-confirmed values.
   */
  async tokenizePaymentMethod(
    request: TokenizePaymentMethodRequest,
  ): Promise<TokenizePaymentMethodResponse> {
    const { gatewayReference, userEmail } = request;

    if (!gatewayReference || typeof gatewayReference !== 'string') {
      return { success: false, error: 'A valid gatewayReference is required' };
    }

    this.logger.log(
      `Tokenizing payment method via gateway reference ${gatewayReference}`,
    );

    if (this.gateway === 'paystack') {
      return this.verifyAndTokenizePaystack(gatewayReference);
    }

    if (this.gateway === 'flutterwave') {
      return this.verifyAndTokenizeFlutterwave(gatewayReference, userEmail);
    }

    return { success: true, token: `mock_token_${Date.now()}` };
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
              httpsAgent:
                this.certificatePinningService.getHttpsAgent('api.paystack.co'),
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

  /**
   * Verifies a Paystack transaction reference server-side and extracts the
   * real authorization from the response. This IS the tokenization step:
   * Paystack has no separate "tokenize without charging" endpoint — the
   * client charges via Paystack.js/Popup and hands us the resulting
   * `reference`, and this verify call is the only trustworthy source of the
   * `authorization_code` we later charge against.
   */
  private async verifyAndTokenizePaystack(
    gatewayReference: string,
  ): Promise<TokenizePaymentMethodResponse> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('PAYSTACK_SECRET_KEY is not configured');
    }

    return this.executeGatewayCall('payment-gateway:paystack:tokenize', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(gatewayReference)}`,
            {
              headers: {
                Authorization: `Bearer ${secret}`,
              },
              httpsAgent:
                this.certificatePinningService.getHttpsAgent('api.paystack.co'),
            },
          );

          const data = response.data?.data;
          if (
            response.data?.status !== true ||
            data?.status !== 'success' ||
            !data?.authorization
          ) {
            return {
              success: false,
              error: response.data?.message || 'Paystack verification failed',
            };
          }

          const authorization = data.authorization;
          if (!authorization.authorization_code) {
            return {
              success: false,
              error:
                'Paystack verification did not return an authorization code',
            };
          }

          return {
            success: true,
            token: authorization.authorization_code,
            last4: authorization.last4,
            expiryMonth: authorization.exp_month
              ? parseInt(authorization.exp_month, 10)
              : undefined,
            expiryYear: authorization.exp_year
              ? parseInt(authorization.exp_year, 10)
              : undefined,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.verifyAndTokenizePaystack',
      ),
    );
  }

  /**
   * Verifies a Flutterwave transaction server-side and extracts the real
   * card token from the response, mirroring chargeFlutterwave's request
   * pattern (executeGatewayCall + retryService + certificate-pinned http
   * client). `gatewayReference` is Flutterwave's `tx_ref` (the client-side
   * reference generated before charging), verified via the
   * verify_by_reference endpoint.
   *
   * NOTE (uncertain, flagged explicitly): I could not verify with full
   * confidence the exact response field name Flutterwave uses for the
   * reusable card token on this endpoint. `chargeFlutterwave` in this file
   * already reads a `token` field from stored metadata, so I mirror that
   * name here and read it from `data.card.token`, which matches Flutterwave's
   * documented card-tokenization response shape, but this specific field
   * path is the one piece of this implementation I am not fully certain of
   * without live-testing against the real API. `last4`/expiry extraction
   * from `data.card.last_4digits` and `data.card.expiry` (a combined "MM/YY"
   * string) is based on Flutterwave's general transaction-verify response
   * shape and should be double-checked against a real response before
   * relying on it in production.
   */
  private async verifyAndTokenizeFlutterwave(
    gatewayReference: string,
    _userEmail: string,
  ): Promise<TokenizePaymentMethodResponse> {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('FLUTTERWAVE_SECRET_KEY is not configured');
    }

    return this.executeGatewayCall('payment-gateway:flutterwave:tokenize', () =>
      this.retryService.execute(
        async () => {
          const response = await this.http.get(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(gatewayReference)}`,
            {
              headers: {
                Authorization: `Bearer ${secret}`,
              },
              httpsAgent: this.certificatePinningService.getHttpsAgent(
                'api.flutterwave.com',
              ),
            },
          );

          const data = response.data?.data;
          if (response.data?.status !== 'success' || !data) {
            return {
              success: false,
              error:
                response.data?.message || 'Flutterwave verification failed',
            };
          }

          if (data.status !== 'successful') {
            return {
              success: false,
              error: `Flutterwave transaction status was "${data.status}", expected "successful"`,
            };
          }

          const cardToken: string | undefined = data.card?.token;
          if (!cardToken) {
            return {
              success: false,
              error:
                'Flutterwave verification did not return a reusable card token',
            };
          }

          const last4: string | undefined = data.card?.last_4digits;
          let expiryMonth: number | undefined;
          let expiryYear: number | undefined;
          const expiry: string | undefined = data.card?.expiry;
          if (expiry && expiry.includes('/')) {
            const [month, year] = expiry.split('/');
            expiryMonth = parseInt(month, 10) || undefined;
            const parsedYear = parseInt(year, 10);
            if (!isNaN(parsedYear)) {
              // Flutterwave returns a 2-digit year in this field.
              expiryYear = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
            }
          }

          return {
            success: true,
            token: cardToken,
            last4,
            expiryMonth,
            expiryYear,
          };
        },
        { retryableErrors: [NetworkError, TimeoutError] },
        'PaymentGateway.verifyAndTokenizeFlutterwave',
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
              httpsAgent:
                this.certificatePinningService.getHttpsAgent('api.paystack.co'),
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
