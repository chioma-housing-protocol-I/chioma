import { Injectable } from '@nestjs/common';
import { SpanStatusCode, trace, Tracer } from '@opentelemetry/api';

/** Stable span names for the critical payment flow. Keep this list bounded. */
export const PAYMENT_SPANS = {
  AUTH: 'payment.auth',
  VALIDATION: 'payment.validation',
  CONTRACT_CALL: 'payment.contract_call',
  CONFIRMATION: 'payment.confirmation',
} as const;

export type PaymentSpanName =
  (typeof PAYMENT_SPANS)[keyof typeof PAYMENT_SPANS];

/** Bounded attribute keys. Never put card data, secrets or tx payloads here. */
export const PAYMENT_SPAN_ATTRIBUTES = {
  OPERATION: 'payment.operation',
  STATUS: 'payment.status',
  DURATION_MS: 'payment.duration_ms',
  ERROR_CLASS: 'payment.error_class',
} as const;

export interface PaymentSpanAttributes {
  operation?: string;
  errorClass?: string;
}

const TRACER_NAME = 'chioma.payments';

function errorClassOf(error: unknown): string {
  if (error instanceof Error) {
    return error.constructor.name;
  }
  return 'UnknownError';
}

/**
 * Runs one payment phase inside an OpenTelemetry span. The global SDK set up
 * in `common/tracing/tracing.ts` exports these spans to the configured trace
 * backend; before it starts, the API's no-op tracer keeps this safe to call.
 */
export async function tracePaymentOperation<T>(
  spanName: PaymentSpanName,
  attributes: PaymentSpanAttributes,
  operation: () => Promise<T> | T,
  tracer?: Tracer,
): Promise<T> {
  const activeTracer = tracer ?? trace.getTracer(TRACER_NAME);
  return activeTracer.startActiveSpan(spanName, async (span) => {
    const startedAt = process.hrtime.bigint();
    span.setAttributes({
      [PAYMENT_SPAN_ATTRIBUTES.OPERATION]: attributes.operation ?? 'unknown',
    });

    try {
      const result = await operation();
      span.setAttributes({
        [PAYMENT_SPAN_ATTRIBUTES.STATUS]: 'ok',
      });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      span.setAttributes({
        [PAYMENT_SPAN_ATTRIBUTES.STATUS]: 'error',
        [PAYMENT_SPAN_ATTRIBUTES.ERROR_CLASS]: errorClassOf(error),
      });
      throw error;
    } finally {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      span.setAttributes({
        [PAYMENT_SPAN_ATTRIBUTES.DURATION_MS]:
          Math.round(durationMs * 100) / 100,
      });
      span.end();
    }
  });
}

/** Injectable facade so callers can be tested without a live OTel SDK. */
@Injectable()
export class PaymentTracer {
  private readonly tracer: Tracer;

  constructor(tracer?: Tracer) {
    this.tracer = tracer ?? trace.getTracer(TRACER_NAME);
  }

  validation<T>(
    operation: () => Promise<T> | T,
    attributes?: PaymentSpanAttributes,
  ) {
    return tracePaymentOperation(
      PAYMENT_SPANS.VALIDATION,
      attributes ?? {},
      operation,
      this.tracer,
    );
  }

  auth<T>(operation: () => Promise<T> | T, attributes?: PaymentSpanAttributes) {
    return tracePaymentOperation(
      PAYMENT_SPANS.AUTH,
      attributes ?? {},
      operation,
      this.tracer,
    );
  }

  contractCall<T>(
    operation: () => Promise<T> | T,
    attributes?: PaymentSpanAttributes,
  ) {
    return tracePaymentOperation(
      PAYMENT_SPANS.CONTRACT_CALL,
      attributes ?? {},
      operation,
      this.tracer,
    );
  }

  confirmation<T>(
    operation: () => Promise<T> | T,
    attributes?: PaymentSpanAttributes,
  ) {
    return tracePaymentOperation(
      PAYMENT_SPANS.CONFIRMATION,
      attributes ?? {},
      operation,
      this.tracer,
    );
  }
}

/** Used when PaymentTracer is not provided by DI (for example in unit tests). */
export const DEFAULT_PAYMENT_TRACER = new PaymentTracer();
