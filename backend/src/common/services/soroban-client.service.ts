import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
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
import { BlockchainConnectionError } from '../errors/domain-errors';

export interface SorobanHealthStatus {
  status: 'up' | 'down';
  rpcUrl: string;
  error?: string;
}

// ── Connection probe constants ────────────────────────────────────────────────

/** Maximum number of attempts during the startup connection probe. */
const PROBE_MAX_ATTEMPTS = 5;

/** Initial backoff delay in ms — doubles on each retry (capped at MAX_DELAY). */
const PROBE_INITIAL_DELAY_MS = 1_000;

/** Hard ceiling on any single retry wait. */
const PROBE_MAX_DELAY_MS = 16_000;

/** Backoff multiplier (exponential). */
const PROBE_BACKOFF_MULTIPLIER = 2;

// ── Connection status ─────────────────────────────────────────────────────────

export type SorobanConnectionStatus =
  | 'connected'       // probe succeeded at startup
  | 'disconnected'    // probe failed after all retries
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
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
    this.server = new SorobanRpc.Server(rpcUrl);
    this.contractId = this.configService.get<string>('CHIOMA_CONTRACT_ID', '');
    this.networkPassphrase = this.getNetworkPassphrase();
    if (!this.contractId) this.logger.warn('CHIOMA_CONTRACT_ID not set - on-chain features will be disabled');
  private readonly connectAttempts: number;
  private readonly connectBaseDelayMs: number;
  private connected = false;

  constructor(private configService: ConfigService) {
    this.rpcUrl = this.configService.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.server = new SorobanRpc.Server(this.rpcUrl);
    this.server = new SorobanRpc.Server(this.rpcUrl, {
      allowHttp: this.rpcUrl.startsWith('http://'),
      timeout: 5000,
    });
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
   * Probes the Soroban RPC before the process is treated as ready.
   * Jest sets NODE_ENV=test, so the live probe is skipped there; the failure
   * and retry path is covered by calling verifyConnection() directly.
   */
  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.logger.log(
        'Skipping Soroban startup connection check in test environment',
      );
      return;
    }
    await this.verifyConnection();
  }

  async verifyConnection(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.connectAttempts; attempt++) {
      try {
        await this.server.getHealth();
        this.connected = true;
        this.logger.log(
          `Soroban RPC connected at ${this.rpcUrl} (attempt ${attempt})`,
        );
        return;
      } catch (error) {
        lastError = error;
        this.connected = false;
        if (attempt < this.connectAttempts && this.connectBaseDelayMs > 0) {
          const delay = this.connectBaseDelayMs * 2 ** (attempt - 1);
          this.logger.warn(
            `Soroban RPC connection attempt ${attempt} failed, retrying in ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    const detail =
      lastError instanceof Error ? lastError.message : 'unknown error';
    throw new BlockchainConnectionError(
      `Soroban RPC unreachable at ${this.rpcUrl} after ${this.connectAttempts} attempts: ${detail}`,
      { rpcUrl: this.rpcUrl, attempts: this.connectAttempts },
    );
  }

  async checkHealth(): Promise<SorobanHealthStatus> {
    try {
      await this.server.getHealth();
      this.connected = true;
      return { status: 'up', rpcUrl: this.rpcUrl };
    } catch (error) {
      this.connected = false;
      return {
        status: 'down',
        rpcUrl: this.rpcUrl,
        error:
          error instanceof Error
            ? error.message
            : 'Soroban RPC health check failed',
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getServer(): SorobanRpc.Server {
    return this.server;
  }

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

  // ── Existing public API (unchanged) ───────────────────────────────────────

  getServer(): SorobanRpc.Server {
    return this.server;
  }

  getContractId(): string {
    return this.contractId;
  }

  getNetworkPassphraseValue(): string {
    return this.networkPassphrase;
  }

  getServer(): SorobanRpc.Server { return this.server; }
  getContractId(): string { return this.contractId; }
  getNetworkPassphraseValue(): string { return this.networkPassphrase; }
  getBaseFee(): string { return BASE_FEE; }

  private getNetworkPassphrase(): string {
    return this.configService.get<string>('STELLAR_NETWORK', 'testnet') === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
  }

  getServerKeypair(): Keypair {
    const secretKey = this.configService.get<string>('SERVER_STELLAR_SECRET');
    if (!secretKey) throw new InternalServerErrorException('SERVER_STELLAR_SECRET environment variable is not set');
    return Keypair.fromSecret(secretKey);
  }

  async getAccount(publicKey: string): Promise<Account> { return await this.server.getAccount(publicKey); }
  getContract(): Contract { this.ensureContractId(); return new Contract(this.contractId); }
  createTransactionBuilder(account: Account): TransactionBuilder { return new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: this.networkPassphrase }); }

  private async waitForTransaction(txHash: string, maxAttempts = 5): Promise<SorobanRpc.Api.GetTransactionResponse> {
    let response = await this.server.getTransaction(txHash);
    for (let attempt = 0; response.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempt < maxAttempts; attempt++) {
      await this.sleep(1000 * 2 ** attempt);
      response = await this.server.getTransaction(txHash);
    }
    return response;
  }

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof BadRequestException)) return true;
    const message = JSON.stringify(error.getResponse()).toLowerCase();
    return !message.includes('invalid') && !message.includes('validation');
  }

  async submitTransaction(transaction: ReturnType<TransactionBuilder['build']>, signerKeypair: Keypair): Promise<string> {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const simulateResponse = await this.server.simulateTransaction(transaction);
        if (SorobanRpc.Api.isSimulationError(simulateResponse)) throw new BadRequestException(`Transaction simulation failed: ${simulateResponse.error}`);
        if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) throw new BadRequestException('Transaction simulation failed');
        const preparedTx = SorobanRpc.assembleTransaction(transaction, simulateResponse).build();
        preparedTx.sign(signerKeypair);
        const sendResponse = await this.server.sendTransaction(preparedTx);
        if (sendResponse.status === 'ERROR') throw new BadRequestException(`Failed to submit transaction: ${JSON.stringify(sendResponse.errorResult)}`);
        const txHash = sendResponse.hash;
        const result = await this.waitForTransaction(txHash);
        if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          this.logger.log(`Transaction successful: ${txHash}`);
          return txHash;
        }
        if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) throw new BadRequestException(`Transaction failed: ${txHash}`);
        throw new Error(`Transaction status unresolved: ${txHash}`);
      } catch (error) {
        if (!this.isRetryable(error) || attempt === 5) throw error;
        this.logger.warn(`Soroban transaction retry ${attempt}/5`, error instanceof Error ? error.message : String(error));
        await this.sleep(1000 * attempt);
      }
    }
    throw new BadRequestException('Soroban transaction failed after retries');
  }

  async simulateTransaction(transaction: ReturnType<TransactionBuilder['build']>): Promise<SorobanRpc.Api.SimulateTransactionResponse> { return await this.server.simulateTransaction(transaction); }
  ensureContractId(): void { if (!this.contractId) throw new BadRequestException('On-chain features are not configured. CHIOMA_CONTRACT_ID is not set.'); }
  verifyStellarAddress(address: string): boolean { return !!address && /^G[A-Z2-7]{55}$/.test(address); }
  private sleep(ms: number): Promise<void> { return new Promise((resolve) => setTimeout(resolve, ms)); }
  verifyStellarAddress(address: string): boolean {
    if (!address) return false;
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getNetworkPassphrase(): string {
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );
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
  private readPositiveInt(key: string, fallback: number): number {
    const value = Number(this.configService.get(key, fallback));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private readNonNegativeInt(key: string, fallback: number): number {
    const value = Number(this.configService.get(key, fallback));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
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
