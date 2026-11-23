/** Bounded label vocabulary for payment gateway metrics. */
export const PAYMENT_GATEWAYS = [
  'paystack',
  'flutterwave',
  'mock',
  'unknown',
] as const;
export type PaymentGatewayLabel = (typeof PAYMENT_GATEWAYS)[number];

export const PAYMENT_OPERATIONS = [
  'charge',
  'refund',
  'tokenize',
  'other',
] as const;
export type PaymentOperationLabel = (typeof PAYMENT_OPERATIONS)[number];

export const PAYMENT_ERROR_CLASSES = [
  'network',
  'timeout',
  'validation',
  'circuit_open',
  'gateway',
  'unknown',
] as const;
export type PaymentErrorClassLabel = (typeof PAYMENT_ERROR_CLASSES)[number];

export interface PaymentGatewayOperation {
  gateway: string;
  operation: string;
  success: boolean;
  retries?: number;
  errorClass?: string;
}

export interface PaymentGatewayStats {
  total: number;
  successes: number;
  failures: number;
  successRate: number;
  errorRate: number;
  retries: number;
  operations: Partial<Record<PaymentOperationLabel, number>>;
  errors: Partial<Record<PaymentErrorClassLabel, number>>;
}

export type PaymentGatewayMetricsSnapshot = Record<string, PaymentGatewayStats>;

function matchLabel<T extends string>(
  values: readonly T[],
  raw: string | undefined,
  fallback: T,
): T {
  const normalized = (raw ?? '').trim().toLowerCase();
  return values.find((value) => normalized.includes(value)) ?? fallback;
}

export function normalizeGateway(raw: string | undefined): PaymentGatewayLabel {
  return matchLabel(PAYMENT_GATEWAYS, raw, 'unknown');
}

export function normalizeOperation(
  raw: string | undefined,
): PaymentOperationLabel {
  return matchLabel(PAYMENT_OPERATIONS, raw, 'other');
}

export function normalizeErrorClass(
  raw: string | undefined,
): PaymentErrorClassLabel {
  return matchLabel(PAYMENT_ERROR_CLASSES, raw, 'unknown');
}

/** Parses contexts such as `PaymentGateway.chargePaystack`. */
export function parseGatewayContext(context: string): {
  gateway: PaymentGatewayLabel;
  operation: PaymentOperationLabel;
} {
  return {
    gateway: normalizeGateway(context),
    operation: normalizeOperation(context),
  };
}

export function emptyGatewayStats(): PaymentGatewayStats {
  return {
    total: 0,
    successes: 0,
    failures: 0,
    successRate: 0,
    errorRate: 0,
    retries: 0,
    operations: {},
    errors: {},
  };
}
