import { MetricsService } from '../monitoring/metrics.service';
import { PaymentGatewayService } from './payment-gateway.service';

const metrics = () => new MetricsService();

describe('payment gateway metrics (#2187)', () => {
  it('records success, retry and error metrics with bounded labels', async () => {
    const service = metrics();
    service.recordPaymentGatewayOperation({
      gateway: 'paystack',
      operation: 'charge',
      success: false,
      retries: 2,
      errorClass: 'timeout',
    });
    service.recordPaymentGatewayOperation({
      gateway: 'paystack',
      operation: 'charge',
      success: true,
      retries: 0,
    });

    const snapshot = service.getPaymentGatewayMetrics();

    expect(snapshot.paystack).toEqual(
      expect.objectContaining({
        total: 2,
        successes: 1,
        failures: 1,
        successRate: 0.5,
        errorRate: 0.5,
        retries: 2,
      }),
    );
    expect(snapshot.paystack.errors.timeout).toBe(1);
    expect(snapshot.paystack.operations.charge).toBe(2);

    const text = await service.getMetrics();
    expect(text).toContain('payment_gateway_operations_total');
    expect(text).toContain('payment_gateway_retry_count');
    expect(text).toContain('payment_gateway_errors_total');
    expect(text).toContain('gateway="paystack"');
  });

  it('normalises unknown gateways, operations and error classes', () => {
    const service = metrics();
    service.recordPaymentGatewayOperation({
      gateway: 'new-gateway-from-env',
      operation: 'something-new',
      success: false,
      retries: 1,
      errorClass: 'brand-new-error',
    });

    const snapshot = service.getPaymentGatewayMetrics();
    expect(snapshot.unknown).toBeDefined();
    expect(snapshot.unknown.operations.other).toBe(1);
    expect(snapshot.unknown.errors.unknown).toBe(1);
  });

  it('records a gateway operation from the payment gateway service', async () => {
    const previous = process.env.PAYMENT_GATEWAY;
    process.env.PAYMENT_GATEWAY = 'mock';
    const service = metrics();
    const gateway = new PaymentGatewayService(
      { execute: jest.fn() } as never,
      { execute: jest.fn((_name: string, fn: () => unknown) => fn()) } as never,
      { getHttpsAgent: jest.fn() } as never,
      service,
    );

    try {
      const result = await gateway.chargePayment({
        paymentMethod: { id: 'pm-1' } as never,
        amount: 100,
        currency: 'USD',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(true);
      expect(service.getPaymentGatewayMetrics().mock.total).toBe(1);
    } finally {
      if (previous === undefined) {
        delete process.env.PAYMENT_GATEWAY;
      } else {
        process.env.PAYMENT_GATEWAY = previous;
      }
    }
  });
});
