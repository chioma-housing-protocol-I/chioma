import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { AgentTransaction } from '../entities/agent-transaction.entity';

export interface AgentInfo {
  agent: string;
  externalProfileHash: string;
  verified: boolean;
  registeredAt: number;
  verifiedAt: number | null;
  totalRatings: number;
  totalScore: number;
  completedAgreements: number;
  averageRating: number;
}

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract: Contract | null;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AgentTransaction)
    private readonly agentTransactionRepo: Repository<AgentTransaction>,
  ) {
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

  async registerAgent(
    agentAddress: string,
    profileHash: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'register_agent',
        new StellarSdk.Address(agentAddress).toScVal(),
        xdr.ScVal.scvString(profileHash),
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
      this.logger.log(`Agent registered: ${agentAddress} tx=${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Agent registration failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async verifyAgent(
    adminAddress: string,
    agentAddress: string,
  ): Promise<string> {
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
        new StellarSdk.Address(adminAddress).toScVal(),
        new StellarSdk.Address(agentAddress).toScVal(),
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
      this.logger.log(`Agent verified: ${agentAddress} tx=${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Agent verification failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async rateAgent(
    raterAddress: string,
    agentAddress: string,
    score: number,
    transactionId: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    if (score < 1 || score > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'rate_agent',
        new StellarSdk.Address(raterAddress).toScVal(),
        new StellarSdk.Address(agentAddress).toScVal(),
        StellarSdk.nativeToScVal(score, { type: 'u32' }),
        xdr.ScVal.scvString(transactionId),
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
      this.logger.log(
        `Rating submitted: agent=${agentAddress} score=${score} tx=${hash}`,
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

  async getAgentInfo(agentAddress: string): Promise<AgentInfo | null> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'get_agent_info',
        new StellarSdk.Address(agentAddress).toScVal(),
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
        const result = StellarSdk.scValToNative(simulated.result.retval);
        if (!result) return null;

        return {
          agent: agentAddress,
          externalProfileHash: result.external_profile_hash || '',
          verified: result.verified || false,
          registeredAt: Number(result.registered_at) || 0,
          verifiedAt: result.verified_at ? Number(result.verified_at) : null,
          totalRatings: Number(result.total_ratings) || 0,
          totalScore: Number(result.total_score) || 0,
          completedAgreements: Number(result.completed_agreements) || 0,
          averageRating:
            result.total_ratings > 0
              ? result.total_score / result.total_ratings
              : 0,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Get agent info failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAgentCount(): Promise<number> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call('get_agent_count');

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return Number(StellarSdk.scValToNative(simulated.result.retval)) || 0;
      }
      return 0;
    } catch (error) {
      this.logger.error(
        `Get agent count failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async registerTransaction(
    transactionId: string,
    agentAddress: string,
    parties: string[],
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const partiesScVal = xdr.ScVal.scvVec(
        parties.map((p) => new StellarSdk.Address(p).toScVal()),
      );

      const operation = this.contract.call(
        'register_transaction',
        xdr.ScVal.scvString(transactionId),
        new StellarSdk.Address(agentAddress).toScVal(),
        partiesScVal,
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

      await this.agentTransactionRepo.save({
        transactionId,
        agentAddress,
        parties,
        completed: false,
        blockchainHash: hash,
      });

      this.logger.log(`Transaction registered: ${transactionId} tx=${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Transaction registration failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async completeTransaction(
    transactionId: string,
    agentAddress: string,
  ): Promise<string> {
    if (!this.contract || !this.adminKeypair) {
      throw new BadRequestException('Agent registry contract not configured');
    }
    try {
      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'complete_transaction',
        xdr.ScVal.scvString(transactionId),
        new StellarSdk.Address(agentAddress).toScVal(),
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

      await this.agentTransactionRepo.update(
        { transactionId },
        { completed: true, blockchainHash: hash },
      );

      this.logger.log(`Transaction completed: ${transactionId} tx=${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Transaction completion failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAgentTransactions(
    agentAddress: string,
  ): Promise<AgentTransaction[]> {
    return this.agentTransactionRepo.find({
      where: { agentAddress },
      order: { createdAt: 'DESC' },
    });
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
