import {
  Injectable,
  Logger,
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

@Injectable()
export class SorobanClientService implements OnModuleInit {
  private readonly logger = new Logger(SorobanClientService.name);
  private readonly server: SorobanRpc.Server;
  private readonly rpcUrl: string;
  private readonly contractId: string;
  private readonly networkPassphrase: string;
  private readonly connectAttempts: number;
  private readonly connectBaseDelayMs: number;
  private connected = false;

  constructor(private configService: ConfigService) {
    this.rpcUrl = this.configService.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
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

    if (!this.contractId) {
      this.logger.warn(
        'CHIOMA_CONTRACT_ID not set - on-chain features will be disabled',
      );
    }
  }

  /**
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

  getContractId(): string {
    return this.contractId;
  }

  getNetworkPassphraseValue(): string {
    return this.networkPassphrase;
  }

  getBaseFee(): string {
    return BASE_FEE;
  }

  private getNetworkPassphrase(): string {
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );
    return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
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

  async submitTransaction(
    transaction: ReturnType<TransactionBuilder['build']>,
    signerKeypair: Keypair,
  ): Promise<string> {
    const simulateResponse = await this.server.simulateTransaction(transaction);

    if (SorobanRpc.Api.isSimulationError(simulateResponse)) {
      this.logger.error(`Simulation error: ${simulateResponse.error}`);
      throw new BadRequestException(
        `Transaction simulation failed: ${simulateResponse.error}`,
      );
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
      throw new BadRequestException('Transaction simulation failed');
    }

    const preparedTx = SorobanRpc.assembleTransaction(
      transaction,
      simulateResponse,
    ).build();

    preparedTx.sign(signerKeypair);

    const sendResponse = await this.server.sendTransaction(preparedTx);

    if (sendResponse.status === 'ERROR') {
      this.logger.error(
        `Transaction send error: ${JSON.stringify(sendResponse.errorResult)}`,
      );
      throw new BadRequestException('Failed to submit transaction');
    }

    const txHash = sendResponse.hash;
    let getResponse = await this.server.getTransaction(txHash);

    while (
      getResponse.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      await this.sleep(1000);
      getResponse = await this.server.getTransaction(txHash);
    }

    if (getResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      this.logger.log(`Transaction successful: ${txHash}`);
      return txHash;
    }

    this.logger.error(`Transaction failed: ${txHash}`);
    throw new BadRequestException('Transaction failed');
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
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

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
