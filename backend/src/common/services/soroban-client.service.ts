import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Keypair,
  Networks,
  TransactionBuilder,
  Contract,
  SorobanRpc,
  BASE_FEE,
  Account,
} from '@stellar/stellar-sdk';
import { waitForSorobanTransactionSuccess } from '../../modules/stellar/services/soroban-transaction-poller';

@Injectable()
export class SorobanClientService {
  private readonly logger = new Logger(SorobanClientService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contractId: string;
  private readonly networkPassphrase: string;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.server = new SorobanRpc.Server(rpcUrl);
    this.contractId = this.configService.get<string>('CHIOMA_CONTRACT_ID', '');
    this.networkPassphrase = this.getNetworkPassphrase();

    if (!this.contractId) {
      this.logger.warn(
        'CHIOMA_CONTRACT_ID not set - on-chain features will be disabled',
      );
    }
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
    try {
      await waitForSorobanTransactionSuccess(
        this.server,
        txHash,
        this.configService,
      );
      this.logger.log(`Transaction successful: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Transaction failed or timed out: ${txHash}`, error);
      throw new BadRequestException('Transaction failed or timed out');
    }
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

}
