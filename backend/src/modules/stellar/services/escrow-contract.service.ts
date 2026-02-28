import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';

export interface CreateEscrowParams {
  depositor: string;
  beneficiary: string;
  arbiter: string;
  amount: string;
  token: string;
}

export interface EscrowData {
  id: string;
  depositor: string;
  beneficiary: string;
  arbiter: string;
  amount: string;
  token: string;
  status: string;
  createdAt: number;
  disputeReason?: string;
}

@Injectable()
export class EscrowContractService {
  private readonly logger = new Logger(EscrowContractService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract?: Contract;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const contractId =
      this.configService.get<string>('ESCROW_CONTRACT_ID') || '';
    const adminSecret =
      this.configService.get<string>('STELLAR_ADMIN_SECRET_KEY') || '';
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    this.server = new SorobanRpc.Server(rpcUrl);

    // Only create contract if contractId is provided
    if (contractId) {
      this.contract = new Contract(contractId);
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'ESCROW_CONTRACT_ID not set - escrow features will be disabled',
      );
      this.isConfigured = false;
    }

    this.networkPassphrase =
      network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  async createEscrow(params: CreateEscrowParams): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'create',
        new StellarSdk.Address(params.depositor).toScVal(),
        new StellarSdk.Address(params.beneficiary).toScVal(),
        new StellarSdk.Address(params.arbiter).toScVal(),
        StellarSdk.nativeToScVal(BigInt(params.amount), { type: 'i128' }),
        new StellarSdk.Address(params.token).toScVal(),
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
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to create escrow: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async fundEscrow(
    escrowId: string,
    caller: string,
    callerKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(caller);

      const operation = this.contract.call(
        'fund_escrow',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
        new StellarSdk.Address(caller).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(callerKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(`Failed to fund escrow: ${error.message}`, error.stack);
      throw error;
    }
  }

  async approveRelease(
    escrowId: string,
    caller: string,
    releaseTo: string,
    callerKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(caller);

      const operation = this.contract.call(
        'approve_release',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
        new StellarSdk.Address(caller).toScVal(),
        new StellarSdk.Address(releaseTo).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(callerKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to approve release: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async raiseDispute(
    escrowId: string,
    caller: string,
    reason: string,
    callerKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(caller);

      const operation = this.contract.call(
        'raise_dispute',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
        new StellarSdk.Address(caller).toScVal(),
        xdr.ScVal.scvString(reason),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(callerKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to raise dispute: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async resolveDispute(
    escrowId: string,
    arbiter: string,
    releaseTo: string,
    arbiterKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(arbiter);

      const operation = this.contract.call(
        'resolve_dispute',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
        new StellarSdk.Address(arbiter).toScVal(),
        new StellarSdk.Address(releaseTo).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(arbiterKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to resolve dispute: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getEscrow(escrowId: string): Promise<EscrowData | null> {
    try {
      if (!this.isConfigured || !this.contract) {
        return null;
      }
      if (!this.adminKeypair) {
        return null;
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'get_escrow',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
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
        return this.parseEscrowResult(simulated.result.retval);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get escrow: ${error.message}`, error.stack);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.server.getHealth();
      return true;
    } catch {
      return false;
    }
  }

  private async pollTransactionStatus(
    hash: string,
    maxAttempts = 10,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

  private parseEscrowResult(result: xdr.ScVal): EscrowData | null {
    try {
      const native = StellarSdk.scValToNative(result);
      return {
        id: native.id,
        depositor: native.depositor,
        beneficiary: native.beneficiary,
        arbiter: native.arbiter,
        amount: native.amount?.toString() || '0',
        token: native.token,
        status: native.status,
        createdAt: native.created_at,
        disputeReason: native.dispute_reason,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse escrow result: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
