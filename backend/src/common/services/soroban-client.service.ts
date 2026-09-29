import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  Optional,
  OnModuleInit,
  Controller,
  Get,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Contract,
  SorobanRpc,
  BASE_FEE,
  Account,
} from '@stellar/stellar-sdk';
import {
  waitForSorobanTransactionSuccess,
  SorobanTransactionFailedError,
  SorobanTransactionTimeoutError,
} from '../../modules/stellar/services/soroban-transaction-poller';
import { waitForSorobanTransactionSuccess } from '../../modules/stellar/services/soroban-transaction-poller';
import {
  classifySorobanError,
  sorobanBackoffMs,
  SorobanDeadLetterEntry,
  SorobanDeadLetterHandler,
  SorobanSubmissionError,
  SOROBAN_DEAD_LETTER_HANDLER,
} from './soroban-errors';

/** Max failed transactions kept in the in-memory dead-letter store. */
const MAX_DEAD_LETTERS = 500;

// ── Connection probe constants ────────────────────────────────────────────────

/** Maximum number of attempts during the startup connection probe. */
const PROBE_MAX_ATTEMPTS = 5;

/** Initial backoff delay in ms — doubles on each retry (capped at MAX_DELAY). */
const PROBE_INITIAL_DELAY_MS = 1_000;

/** Hard ceiling on any single retry wait. */
const PROBE_MAX_DELAY_MS = 16_000;

/** Backoff multiplier (exponential). */
const PROBE_BACKOFF_MULTIPLIER = 2;

// ── Transaction submission constants ─────────────────────────────────────────

/** Number of submission attempts before giving up. */
const TX_MAX_ATTEMPTS = 5;

/** Initial backoff delay in ms for transaction retries. */
const TX_INITIAL_BACKOFF_MS = 1_000;

/** Backoff multiplier for transaction retries (exponential). */
const TX_BACKOFF_MULTIPLIER = 2;

/** Hard ceiling on any single transaction retry wait. */
const TX_MAX_BACKOFF_MS = 30_000;

// ── Connection status ─────────────────────────────────────────────────────────

export type SorobanConnectionStatus =
  | 'connected' // probe succeeded at startup
  | 'disconnected' // probe failed after all retries
  | 'not-configured'; // SOROBAN_RPC_URL / CHIOMA_CONTRACT_ID absent

export interface SorobanConnectionState {
  status: SorobanConnectionStatus;
  /** Soroban RPC endpoint that was probed. */
  rpcUrl: string;
  /** Latest ledger sequence returned by the probe, or null on failure. */
  latestLedger: number | null;
  /** Human-readable failure reason, null when connected. */
  failureReason: string | null;
  /** Timestamp of the last successful probe (ISO string), or null. */
  lastConnectedAt: string | null;
  /** Number of startup probe attempts consumed. */
  probeAttempts: number;
}

/**
 * Classifies a Soroban submission/polling error as retriable (transient network
 * issue) or permanent (validation / contract logic failure).
 *
 * Permanent errors should NOT be retried — they will always fail with the same
 * inputs. Transient errors are worth retrying with backoff.
 */
export function isSorobanTransientError(error: unknown): boolean {
  // Explicit permanent failure from the polling layer
  if (error instanceof SorobanTransactionFailedError) return false;

  if (error instanceof BadRequestException) {
    const response = (error as BadRequestException).getResponse();
    const message = JSON.stringify(response).toLowerCase();
    // Validation / contract errors are permanent
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('simulation failed')
    ) {
      return false;
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Permanent contract-level rejections
    if (
      msg.includes('failed to submit transaction') &&
      msg.includes('invalid')
    ) {
      return false;
    }
  }

  // Timeout, network, rate-limit errors are all transient
  return true;
}

@Injectable()
export class SorobanClientService implements OnModuleInit {
  private readonly logger = new Logger(SorobanClientService.name);
  private readonly server: SorobanRpc.Server;
  private readonly rpcUrl: string;
  private readonly contractId: string;
  private readonly networkPassphrase: string;
  private readonly rpcUrl: string;

  private connectionState: SorobanConnectionState;

  constructor(private configService: ConfigService) {
  /** Recent failed transactions, newest last (bounded in-memory DLQ). */
  private readonly deadLetters: SorobanDeadLetterEntry[] = [];

  constructor(
    private configService: ConfigService,
    @Optional()
    @Inject(SOROBAN_DEAD_LETTER_HANDLER)
    private readonly deadLetterHandler?: SorobanDeadLetterHandler,
  ) {
    this.rpcUrl = this.configService.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.server = new SorobanRpc.Server(this.rpcUrl);
    this.contractId = this.configService.get<string>('CHIOMA_CONTRACT_ID', '');
    this.networkPassphrase = this.getNetworkPassphrase();
    this.connectAttempts = this.readPositiveInt('SOROBAN_CONNECT_ATTEMPTS', 3);
    this.connectBaseDelayMs = this.readNonNegativeInt(
      'SOROBAN_CONNECT_BASE_DELAY_MS',
      200,
    );

    this.connectionState = {
      status: 'disconnected',
      rpcUrl: this.rpcUrl,
      latestLedger: null,
      failureReason: 'Connection probe has not run yet',
      lastConnectedAt: null,
      probeAttempts: 0,
    };

    if (!this.contractId) {
      this.logger.warn(
        'CHIOMA_CONTRACT_ID not set - on-chain features will be disabled',
      );
    }
  }

  /**
   * NestJS lifecycle hook — runs once after all providers are wired.
   *
   * Probes the Soroban RPC endpoint with exponential backoff. On success the
   * service is marked `connected` and startup proceeds normally. On exhausted
   * retries the state is set to `disconnected` but the application is still
   * allowed to boot so that non-blockchain request paths keep working; the
   * `/health` endpoint will surface the failure as a `warning`.
   *
   * The deliberate non-fatal stance matches the existing `stellar: 'degraded'`
   * policy: Soroban writes are queued and retried by background jobs, so an
   * RPC outage at boot time should not kill the pod.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      `[STARTUP] Probing Soroban RPC at ${this.rpcUrl} ` +
        `(max ${PROBE_MAX_ATTEMPTS} attempts)…`,
    );

    let lastError: Error | null = null;
    let attempts = 0;

    for (let attempt = 0; attempt < PROBE_MAX_ATTEMPTS; attempt++) {
      attempts = attempt + 1;

      if (attempt > 0) {
        const delayMs = this.calcBackoff(attempt);
        this.logger.warn(
          `[STARTUP] Soroban probe attempt ${attempts}/${PROBE_MAX_ATTEMPTS} ` +
            `— retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }

      try {
        const health = await this.server.getHealth();

        // getHealth() resolves to { status: 'healthy' } on a live node.
        if (health?.status !== 'healthy') {
          throw new Error(
            `Unexpected health status from Soroban RPC: "${health?.status}"`,
          );
        }

        // Grab the latest ledger so the health indicator can report it.
        const latestLedger = await this.server.getLatestLedger();

        this.connectionState = {
          status: 'connected',
          rpcUrl: this.rpcUrl,
          latestLedger: latestLedger?.sequence ?? null,
          failureReason: null,
          lastConnectedAt: new Date().toISOString(),
          probeAttempts: attempts,
        };

        this.logger.log(
          `[STARTUP] Soroban RPC connected on attempt ${attempts}/${PROBE_MAX_ATTEMPTS}. ` +
            `Latest ledger: ${latestLedger?.sequence ?? 'unknown'}`,
        );
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `[STARTUP] Soroban probe attempt ${attempts}/${PROBE_MAX_ATTEMPTS} failed: ` +
            lastError.message,
        );
      }
    }

    // All retries exhausted — log loudly but do not throw; service boots in
    // degraded mode and the health check surfaces the failure.
    const reason =
      lastError?.message ?? 'unknown error after all probe attempts';

    this.connectionState = {
      status: 'disconnected',
      rpcUrl: this.rpcUrl,
      latestLedger: null,
      failureReason: reason,
      lastConnectedAt: null,
      probeAttempts: attempts,
    };

    this.logger.error(
      `[STARTUP] Soroban RPC unreachable after ${PROBE_MAX_ATTEMPTS} attempts. ` +
        `Last error: ${reason}. ` +
        'Application will start in degraded mode; blockchain calls will fail ' +
        'until the RPC node is reachable.',
    );
  }

  // ── Connection status accessors ────────────────────────────────────────────

  /**
   * Returns true only when the startup probe (or the most recent
   * `checkConnection()` call) succeeded.
   */
  isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }

  /**
   * Returns the full connection state snapshot — safe to include in
   * health-check payloads (contains no secrets).
   */
  getConnectionStatus(): SorobanConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Performs a live probe against the Soroban RPC right now and updates the
   * stored connection state.  Used by `SorobanHealthIndicator` on every
   * `/health` poll so the indicator reflects the current reachability, not
   * just the startup result.
   */
  async checkConnection(): Promise<SorobanConnectionState> {
    try {
      const health = await this.server.getHealth();

      if (health?.status !== 'healthy') {
        throw new Error(
          `Unexpected health status from Soroban RPC: "${health?.status}"`,
        );
      }

      const latestLedger = await this.server.getLatestLedger();

      this.connectionState = {
        ...this.connectionState,
        status: 'connected',
        latestLedger: latestLedger?.sequence ?? null,
        failureReason: null,
        lastConnectedAt: new Date().toISOString(),
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      this.connectionState = {
        ...this.connectionState,
        status: 'disconnected',
        latestLedger: null,
        failureReason: reason,
      };
    }

    return this.getConnectionStatus();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getServer(): SorobanRpc.Server {
    return this.server;
  }

  getContractId(): string {
    return this.contractId;
  }

  getNetworkPassphraseValue(): string {
    return this.networkPassphrase;
  }

  getBaseFee(): string {
    return BASE_FEE;
  }

  getServerKeypair(): Keypair {
    const secretKey = this.configService.get<string>('SERVER_STELLAR_SECRET');
    if (!secretKey) {
      throw new InternalServerErrorException(
        'SERVER_STELLAR_SECRET environment variable is not set',
      );
    }
    return Keypair.fromSecret(secretKey);
  }

  async getAccount(publicKey: string): Promise<Account> {
    return await this.server.getAccount(publicKey);
  }

  getContract(): Contract {
    this.ensureContractId();
    return new Contract(this.contractId);
  }

  createTransactionBuilder(account: Account): TransactionBuilder {
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    });
  }

  async simulateTransaction(
    transaction: ReturnType<TransactionBuilder['build']>,
  ): Promise<SorobanRpc.Api.SimulateTransactionResponse> {
    return await this.server.simulateTransaction(transaction);
  }

  ensureContractId(): void {
    if (!this.contractId) {
      throw new BadRequestException(
        'On-chain features are not configured. CHIOMA_CONTRACT_ID is not set.',
      );
    }
  }

  verifyStellarAddress(address: string): boolean {
    if (!address) return false;
    return /^G[A-Z2-7]{55}$/.test(address);
  }

  /**
   * Submits a transaction to Soroban with exponential backoff retry.
   *
   * - Simulates first to catch permanent validation errors early (no retry).
   * - Distinguishes transient (network/timeout) from permanent (validation)
   *   errors via `isSorobanTransientError`.
   * - Polls for transaction confirmation after submission using
   *   `waitForSorobanTransactionSuccess`.
   * - Throws immediately on permanent errors to avoid wasting retry budget.
   *
   * @param transaction - Built (but unsigned) transaction
   * @param signerKeypair - Keypair to sign with
   * @returns Confirmed transaction hash
    return this.server.getAccount(publicKey);
  }

  getContract(): Contract {
    this.ensureContractId();
    return new Contract(this.contractId);
  }

  createTransactionBuilder(account: Account): TransactionBuilder {
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    });
  }

  /**
   * Simulate, sign, submit and poll a Soroban transaction.
   *
   * - Retries retriable failures (network/RPC/timeout) with exponential
   *   backoff up to `SOROBAN_TX_MAX_RETRIES` (default 5) attempts.
   * - Fails fast on permanent failures (validation, simulation, contract).
   * - Polls transaction status until SUCCESS/FAILED or poll timeout.
   * - Records every final failure in the dead-letter store with its hash.
   */
  async submitTransaction(
    transaction: ReturnType<TransactionBuilder['build']>,
    signerKeypair: Keypair,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= TX_MAX_ATTEMPTS; attempt++) {
      try {
        // Simulate first — catches contract/validation failures before sending
        const simulateResponse =
          await this.server.simulateTransaction(transaction);

        if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
          // Simulation errors are always permanent — bail immediately
          throw new BadRequestException(
            `Transaction simulation failed: ${simulateResponse.error}`,
          );
        }

        if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
          throw new BadRequestException('Transaction simulation did not succeed');
    operation = 'soroban_tx',
  ): Promise<string> {
    const maxAttempts = this.getMaxRetries();
    let txHash: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const simulateResponse =
          await this.server.simulateTransaction(transaction);
        if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
          throw new SorobanSubmissionError(
            `Transaction simulation failed: ${simulateResponse.error}`,
            'permanent',
          );
        }
        if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
          throw new SorobanSubmissionError(
            'Transaction simulation failed',
            'permanent',
          );
        }

        const preparedTx = SorobanRpc.assembleTransaction(
          transaction,
          simulateResponse,
        ).build();
        preparedTx.sign(signerKeypair);

        const sendResponse = await this.server.sendTransaction(preparedTx);

        if (sendResponse.status === 'ERROR') {
          throw new BadRequestException(
            `Failed to submit transaction: ${JSON.stringify(sendResponse.errorResult)}`,
          );
        }

        const txHash = sendResponse.hash;

        this.logger.log(
          `[attempt ${attempt}/${TX_MAX_ATTEMPTS}] Transaction submitted: ${txHash}`,
        );

        // Poll for confirmation with its own exponential backoff
        txHash = sendResponse.hash;
        if (sendResponse.status === 'ERROR') {
          const detail = JSON.stringify(sendResponse.errorResult ?? '');
          throw new SorobanSubmissionError(
            `Failed to submit transaction: ${detail}`,
            classifySorobanError(new Error(detail)),
            txHash,
          );
        }
        if (sendResponse.status === 'TRY_AGAIN_LATER') {
          throw new SorobanSubmissionError(
            'RPC asked to try again later',
            'retriable',
            txHash,
          );
        }

        await waitForSorobanTransactionSuccess(
          this.server,
          txHash,
          this.configService,
        );

        this.logger.log(`Transaction confirmed: ${txHash}`);
        return txHash;
      } catch (error) {
        lastError = error;

        // SorobanTransactionFailedError = on-chain execution failure — permanent
        if (error instanceof SorobanTransactionFailedError) {
          this.logger.error(
            `Transaction permanently failed on-chain (hash: ${error.hash}, status: ${error.finalStatus ?? 'unknown'})`,
            error.stack,
          );
          throw new BadRequestException(
            `Transaction failed on-chain: ${error.hash}`,
          );
        }

        // SorobanTransactionTimeoutError = polling timed out — transient, retry
        if (error instanceof SorobanTransactionTimeoutError) {
          this.logger.warn(
            `Transaction polling timed out after ${error.attempts} attempts (hash: ${error.hash}). ` +
              `Submission attempt ${attempt}/${TX_MAX_ATTEMPTS}.`,
          );
          // Fall through to retry logic below
        } else if (!isSorobanTransientError(error)) {
          // Permanent error (validation, contract rejection) — do not retry
          this.logger.error(
            `Permanent Soroban error on attempt ${attempt}/${TX_MAX_ATTEMPTS}: ` +
              (error instanceof Error ? error.message : String(error)),
          );
          throw error;
        } else {
          this.logger.warn(
            `Transient Soroban error on attempt ${attempt}/${TX_MAX_ATTEMPTS}: ` +
              (error instanceof Error ? error.message : String(error)),
          );
        }

        if (attempt < TX_MAX_ATTEMPTS) {
          const delayMs = Math.min(
            TX_INITIAL_BACKOFF_MS * Math.pow(TX_BACKOFF_MULTIPLIER, attempt - 1),
            TX_MAX_BACKOFF_MS,
          );
          this.logger.warn(
            `Retrying in ${delayMs}ms (attempt ${attempt + 1}/${TX_MAX_ATTEMPTS})…`,
          );
          await this.sleep(delayMs);
        }
      }
    }

    this.logger.error(
      `Soroban transaction failed after ${TX_MAX_ATTEMPTS} attempts.`,
      lastError instanceof Error ? lastError.stack : String(lastError),
    );
    throw new BadRequestException(
      `Soroban transaction failed after ${TX_MAX_ATTEMPTS} attempts`,
    );
        this.logger.log(
          `[${operation}] Transaction successful: ${txHash} (attempt ${attempt}/${maxAttempts})`,
        );
        return txHash;
      } catch (error) {
        const kind = classifySorobanError(error);
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[${operation}] Attempt ${attempt}/${maxAttempts} failed ` +
            `(${kind}) tx=${txHash ?? 'n/a'}: ${reason}`,
        );

        if (kind === 'permanent' || attempt === maxAttempts) {
          await this.recordDeadLetter({
            operation,
            txHash,
            kind,
            reason,
            attempts: attempt,
            failedAt: new Date().toISOString(),
          });
          throw new BadRequestException({
            message:
              kind === 'permanent'
                ? `Soroban transaction rejected: ${reason}`
                : `Soroban transaction failed after ${attempt} attempts: ${reason}`,
            kind,
            txHash,
            attempts: attempt,
          });
        }

        await this.sleep(sorobanBackoffMs(attempt));
      }
    }

    // Unreachable: the loop either returns or throws.
    throw new BadRequestException('Soroban transaction failed after retries');
  }

  async simulateTransaction(
    transaction: ReturnType<TransactionBuilder['build']>,
  ): Promise<SorobanRpc.Api.SimulateTransactionResponse> {
    return this.server.simulateTransaction(transaction);
  }

  ensureContractId(): void {
    if (!this.contractId) {
      throw new BadRequestException(
        'On-chain features are not configured. CHIOMA_CONTRACT_ID is not set.',
      );
    }
  }

  verifyStellarAddress(address: string): boolean {
    if (!address) return false;
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  /** Recent dead-lettered transactions (newest last) for ops inspection. */
  getDeadLetters(): SorobanDeadLetterEntry[] {
    return [...this.deadLetters];
  }

  /**
   * Record a failed transaction in the in-memory dead-letter store and
   * forward it to the optional handler. Used by callers that submit
   * transactions outside `submitTransaction` too.
   */
  async recordDeadLetter(entry: SorobanDeadLetterEntry): Promise<void> {
    this.deadLetters.push(entry);
    if (this.deadLetters.length > MAX_DEAD_LETTERS) this.deadLetters.shift();
    this.logger.error(
      `[DLQ] ${entry.operation} tx=${entry.txHash ?? 'n/a'} kind=${entry.kind} ` +
        `attempts=${entry.attempts}: ${entry.reason}`,
    );
    try {
      await this.deadLetterHandler?.handle(entry);
    } catch (err) {
      this.logger.error(
        `[DLQ] Dead-letter handler failed for tx=${entry.txHash ?? 'n/a'}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getMaxRetries(): number {
    const value = Number(
      this.configService.get<string>('SOROBAN_TX_MAX_RETRIES', '5'),
    );
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 5;
  }

  private getNetworkPassphrase(): string {
    const network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');
    return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  }

  /**
   * Exponential backoff capped at `PROBE_MAX_DELAY_MS`.
   * Attempt index is 0-based (first retry is attempt 1).
   */
  private calcBackoff(attempt: number): number {
    const delay =
      PROBE_INITIAL_DELAY_MS * Math.pow(PROBE_BACKOFF_MULTIPLIER, attempt - 1);
    return Math.min(delay, PROBE_MAX_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

@ApiTags('Health')
@Controller('health/soroban')
export class SorobanHealthController {
  constructor(private readonly sorobanClient: SorobanClientService) {}

  @Get()
  @ApiOperation({
    summary: 'Soroban RPC health',
    description:
      'Probes the configured Soroban RPC. Returns 503 when the blockchain endpoint is unreachable.',
  })
  async check(@Res() res: Response) {
    const result = await this.sorobanClient.checkHealth();
    const status =
      result.status === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }
}
