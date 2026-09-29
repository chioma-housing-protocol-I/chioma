import { ConfigService } from '@nestjs/config';
import { SorobanRpc } from '@stellar/stellar-sdk';

export type SorobanTransactionState = 'pending' | 'succeeded' | 'failed';

export interface SorobanPollingOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

export interface SorobanPollingResult {
  hash: string;
  state: SorobanTransactionState;
  attempts: number;
  elapsedMs: number;
  finalStatus?: string;
  response?: unknown;
}

interface SorobanTransactionServer {
  getTransaction(
    hash: string,
  ): Promise<{ status: string; errorResult?: unknown }>;
}

interface SorobanSubmissionResponse {
  hash?: string;
  status?: string;
  errorResult?: unknown;
}

const DEFAULT_MAX_ATTEMPTS = 15;
const DEFAULT_INITIAL_DELAY_MS = 1_000;
const DEFAULT_MAX_DELAY_MS = 8_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;

export class SorobanTransactionFailedError extends Error {
  readonly state: SorobanTransactionState = 'failed';

  constructor(
    readonly hash: string,
    readonly attempts: number,
    readonly finalStatus?: string,
    readonly response?: unknown,
  ) {
    super(`Soroban transaction ${hash} failed with status ${finalStatus}`);
  }
}

export class SorobanTransactionTimeoutError extends Error {
  readonly state: SorobanTransactionState = 'pending';

  constructor(
    readonly hash: string,
    readonly attempts: number,
    readonly finalStatus?: string,
  ) {
    super(
      `Soroban transaction ${hash} remained pending after ${attempts} polling attempts`,
    );
  }
}

export function assertSorobanSubmissionAccepted(
  response: SorobanSubmissionResponse,
): asserts response is SorobanSubmissionResponse & { hash: string } {
  const status = String(response.status ?? '').toUpperCase();

  if (!response.hash) {
    throw new Error('Soroban submission did not return a transaction hash');
  }

  if (status === 'ERROR') {
    throw new Error(
      `Soroban submission failed: ${JSON.stringify(response.errorResult)}`,
    );
  }
}

export function buildSorobanPollingOptions(
  configService: Pick<ConfigService, 'get'>,
): SorobanPollingOptions {
  return {
    maxAttempts: readNumber(configService, 'SOROBAN_TX_POLL_MAX_ATTEMPTS'),
    initialDelayMs: readNumber(
      configService,
      'SOROBAN_TX_POLL_INITIAL_DELAY_MS',
    ),
    maxDelayMs: readNumber(configService, 'SOROBAN_TX_POLL_MAX_DELAY_MS'),
    timeoutMs: readNumber(configService, 'SOROBAN_TX_POLL_TIMEOUT_MS'),
    backoffMultiplier: readNumber(
      configService,
      'SOROBAN_TX_POLL_BACKOFF_MULTIPLIER',
    ),
  };
}

export async function pollSorobanTransaction(
  server: SorobanTransactionServer,
  hash: string,
  optionsOrConfig?: SorobanPollingOptions | Pick<ConfigService, 'get'>,
): Promise<SorobanPollingResult> {
  const options = normalizeOptions(optionsOrConfig);
  const startedAt = Date.now();
  let attempts = 0;
  let delayMs = options.initialDelayMs;
  let finalStatus: string | undefined;
  let lastResponse: unknown;

  while (attempts < options.maxAttempts) {
    attempts += 1;
    const response = await server.getTransaction(hash);
    lastResponse = response;
    finalStatus = response.status;
    const normalizedStatus = normalizeStatus(response.status);

    if (normalizedStatus === 'succeeded') {
      return {
        hash,
        state: 'succeeded',
        attempts,
        elapsedMs: Date.now() - startedAt,
        finalStatus,
        response,
      };
    }

    if (normalizedStatus === 'failed') {
      throw new SorobanTransactionFailedError(
        hash,
        attempts,
        finalStatus,
        response,
      );
    }

    const elapsedMs = Date.now() - startedAt;
    if (attempts >= options.maxAttempts || elapsedMs >= options.timeoutMs) {
      break;
    }

    const remainingMs = Math.max(0, options.timeoutMs - elapsedMs);
    await options.sleep(Math.min(delayMs, remainingMs));
    delayMs = Math.min(
      options.maxDelayMs,
      Math.ceil(delayMs * options.backoffMultiplier),
    );
  }

  throw new SorobanTransactionTimeoutError(hash, attempts, finalStatus);
}

export async function waitForSorobanTransactionSuccess(
  server: SorobanTransactionServer,
  hash: string,
  optionsOrConfig?: SorobanPollingOptions | Pick<ConfigService, 'get'>,
): Promise<string> {
  await pollSorobanTransaction(server, hash, optionsOrConfig);
  return hash;
}

function normalizeOptions(
  optionsOrConfig?: SorobanPollingOptions | Pick<ConfigService, 'get'>,
): Required<SorobanPollingOptions> {
  const configuredOptions =
    optionsOrConfig && 'get' in optionsOrConfig
      ? buildSorobanPollingOptions(optionsOrConfig)
      : optionsOrConfig;

  return {
    maxAttempts: positiveNumber(
      configuredOptions?.maxAttempts,
      DEFAULT_MAX_ATTEMPTS,
    ),
    initialDelayMs: positiveNumber(
      configuredOptions?.initialDelayMs,
      DEFAULT_INITIAL_DELAY_MS,
    ),
    maxDelayMs: positiveNumber(
      configuredOptions?.maxDelayMs,
      DEFAULT_MAX_DELAY_MS,
    ),
    timeoutMs: positiveNumber(configuredOptions?.timeoutMs, DEFAULT_TIMEOUT_MS),
    backoffMultiplier: positiveNumber(
      configuredOptions?.backoffMultiplier,
      DEFAULT_BACKOFF_MULTIPLIER,
    ),
    sleep:
      configuredOptions?.sleep ??
      ((delayMs: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, delayMs))),
  };
}

function normalizeStatus(status: string): SorobanTransactionState {
  const normalized = String(status).toUpperCase();

  if (
    normalized ===
      String(SorobanRpc.Api.GetTransactionStatus.SUCCESS).toUpperCase() ||
    normalized === 'SUCCESS'
  ) {
    return 'succeeded';
  }

  if (
    normalized ===
      String(SorobanRpc.Api.GetTransactionStatus.FAILED).toUpperCase() ||
    normalized === 'FAILED'
  ) {
    return 'failed';
  }

  return 'pending';
}

function readNumber(
  configService: Pick<ConfigService, 'get'>,
  key: string,
): number | undefined {
  const value = configService.get<string | number>(key);
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}
