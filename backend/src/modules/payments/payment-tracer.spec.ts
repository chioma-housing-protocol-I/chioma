import { SpanStatusCode, Tracer } from '@opentelemetry/api';
import {
  DEFAULT_PAYMENT_TRACER,
  PaymentTracer,
  PAYMENT_SPANS,
  tracePaymentOperation,
} from './payment-tracer';

interface RecordedSpan {
  name: string;
  attributes: Record<string, string | number | boolean>;
  status?: { code: SpanStatusCode; message?: string };
  recordedExceptions: unknown[];
  ended: boolean;
}

const fakeTracer = () => {
  const spans: RecordedSpan[] = [];
  const api = {
    startActiveSpan<T>(name: string, fn: (span: unknown) => T): T {
      const span: RecordedSpan = {
        name,
        attributes: {},
        recordedExceptions: [],
        ended: false,
      };
      spans.push(span);
      const handle = {
        setAttributes(attrs: Record<string, string | number | boolean>) {
          Object.assign(span.attributes, attrs);
        },
        setStatus(status: { code: SpanStatusCode; message?: string }) {
          span.status = status;
        },
        recordException(error: unknown) {
          span.recordedExceptions.push(error);
        },
        end() {
          span.ended = true;
        },
      };
      return fn(handle);
    },
  } as unknown as Tracer;
  return { api, spans };
};

describe('payment tracing (#2186)', () => {
  it('uses the four stable critical-flow span names', () => {
    expect(PAYMENT_SPANS.AUTH).toBe('payment.auth');
    expect(PAYMENT_SPANS.VALIDATION).toBe('payment.validation');
    expect(PAYMENT_SPANS.CONTRACT_CALL).toBe('payment.contract_call');
    expect(PAYMENT_SPANS.CONFIRMATION).toBe('payment.confirmation');
  });

  it('records bounded attributes and a duration for each span', async () => {
    const { api, spans } = fakeTracer();
    const tracer = new PaymentTracer(api);

    const result = await tracer.validation(async () => 'validated', {
      operation: 'stellar_rent',
    });

    expect(result).toBe('validated');
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe(PAYMENT_SPANS.VALIDATION);
    expect(spans[0].attributes).toEqual(
      expect.objectContaining({
        'payment.operation': 'stellar_rent',
        'payment.status': 'ok',
      }),
    );
    expect(typeof spans[0].attributes['payment.duration_ms']).toBe('number');
    expect(spans[0].ended).toBe(true);
  });

  it('emits auth, validation, contract call and confirmation in order', async () => {
    const { api, spans } = fakeTracer();
    const tracer = new PaymentTracer(api);

    await tracer.validation(async () => undefined);
    await tracer.auth(async () => undefined);
    await tracer.contractCall(async () => undefined);
    await tracer.confirmation(async () => undefined);

    expect(spans.map((span) => span.name)).toEqual([
      PAYMENT_SPANS.VALIDATION,
      PAYMENT_SPANS.AUTH,
      PAYMENT_SPANS.CONTRACT_CALL,
      PAYMENT_SPANS.CONFIRMATION,
    ]);
  });

  it('marks failed spans with an error status and records the exception', async () => {
    const { api, spans } = fakeTracer();
    const failure = new Error('gateway rejected the call');

    await expect(
      tracePaymentOperation(
        PAYMENT_SPANS.CONTRACT_CALL,
        { operation: 'card_charge' },
        async () => {
          throw failure;
        },
        api,
      ),
    ).rejects.toThrow('gateway rejected the call');

    expect(spans[0].status?.code).toBe(SpanStatusCode.ERROR);
    expect(spans[0].recordedExceptions).toContain(failure);
    expect(spans[0].attributes['payment.status']).toBe('error');
    expect(spans[0].ended).toBe(true);
  });

  it('falls back to a no-op tracer when the SDK is not started', async () => {
    await expect(DEFAULT_PAYMENT_TRACER.auth(async () => 'ok')).resolves.toBe(
      'ok',
    );
  });
});
