import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';

export interface AgentRegistrationParams {
  agentPublicKey: string;
  profileHash: string; // IPFS hash of profile JSON
  agentKeypair: StellarSdk.Keypair;
}

export interface AgentRating {
  agentPublicKey: string;
  raterPublicKey: string;
  rating: number; // 1-5
  transactionId: string;
  raterKeypair: StellarSdk.Keypair;
}

export interface OnChainAgentProfile {
  publicKey: string;
  profileHash: string;
  isVerified: boolean;
  averageRating: number;
  totalRatings: number;
  totalTransactions: number;
  registeredAt: number;
}

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract: Contract | null;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const contractId =
      this.configService.get<string>('AGENT_REGISTRY_CONTRACT_ID') || '';
    const adminSecret =
      this.configService.get<string>('STELLAR_ADMIN_SECRET_KEY') || '';
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    this.server = new SorobanRpc.Server(rpcUrl);
    this.contract = contractId ? new Contract(contractId) : null;
    this.networkPassphrase =
      network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  async registerAgent(params: AgentRegistrationParams): Promise<string> {
    if (!this.contract) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(params.agentPublicKey);

      const operation = this.contract.call(
        'register_agent',
        new StellarSdk.Address(params.agentPublicKey).toScVal(),
        xdr.ScVal.scvString(params.profileHash),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(params.agentKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);
      this.logger.log(
        `Agent registered on-chain: ${params.agentPublicKey} tx=${hash}`,
      );
      return hash;
    } catch (error) {
      this.logger.error(
        `Agent registration failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async verifyAgent(agentPublicKey: string): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException(
        'Agent registry contract or admin keypair not configured',
      );
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'verify_agent',
        new StellarSdk.Address(this.adminKeypair.publicKey()).toScVal(),
        new StellarSdk.Address(agentPublicKey).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);
      this.logger.log(`Agent verified on-chain: ${agentPublicKey} tx=${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Agent verification failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async submitRating(params: AgentRating): Promise<string> {
    if (!this.contract) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    if (params.rating < 1 || params.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    try {
      const account = await this.server.getAccount(params.raterPublicKey);

      const operation = this.contract.call(
        'rate_agent',
        new StellarSdk.Address(params.raterPublicKey).toScVal(),
        new StellarSdk.Address(params.agentPublicKey).toScVal(),
        StellarSdk.nativeToScVal(params.rating, { type: 'u32' }),
        xdr.ScVal.scvString(params.transactionId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(params.raterKeypair);

      const result = await this.server.sendTransaction(prepared);
      const hash = await this.pollTransactionStatus(result.hash);
      this.logger.log(
        `Rating submitted on-chain: agent=${params.agentPublicKey} rating=${params.rating} tx=${hash}`,
      );
      return hash;
    } catch (error) {
      this.logger.error(
        `Rating submission failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAgentProfile(agentPublicKey: string): Promise<OnChainAgentProfile> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'get_agent',
        new StellarSdk.Address(agentPublicKey).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        const native = StellarSdk.scValToNative(simulated.result.retval);
        return {
          publicKey: agentPublicKey,
          profileHash: native.profile_hash || '',
          isVerified: native.is_verified || false,
          averageRating: native.average_rating
            ? Number(native.average_rating) / 100
            : 0,
          totalRatings: Number(native.total_ratings) || 0,
          totalTransactions: Number(native.total_transactions) || 0,
          registeredAt: Number(native.registered_at) || 0,
        };
      }
      throw new NotFoundException('Agent not found in registry');
    } catch (error) {
      this.logger.error(
        `Get agent profile failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async isAgentVerified(agentPublicKey: string): Promise<boolean> {
    try {
      const profile = await this.getAgentProfile(agentPublicKey);
      return profile.isVerified;
    } catch {
      return false;
    }
  }

  private async pollTransactionStatus(
    hash: string,
    maxAttempts = 15,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const txResponse = await this.server.getTransaction(hash);
        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          return hash;
        }
        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
          throw new Error(`Transaction failed: ${hash}`);
        }
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }
    }
    throw new Error(`Transaction timeout: ${hash}`);
  }
}
