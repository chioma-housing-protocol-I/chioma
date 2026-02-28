import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';

export interface CreateAgreementParams {
  agreementId: string;
  landlord: string;
  tenant: string;
  agent?: string;
  monthlyRent: string;
  securityDeposit: string;
  startDate: number;
  endDate: number;
  agentCommissionRate: number;
  paymentToken: string;
}

export interface PaymentSplit {
  landlordAmount: string;
  agentAmount: string;
  totalAmount: string;
}

@Injectable()
export class ChiomaContractService {
  private readonly logger = new Logger(ChiomaContractService.name);
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
      this.configService.get<string>('CHIOMA_CONTRACT_ID') || '';
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
        'CHIOMA_CONTRACT_ID not set - on-chain features will be disabled',
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

  async createAgreement(params: CreateAgreementParams): Promise<string> {
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
        'create_agreement',
        xdr.ScVal.scvString(params.agreementId),
        new StellarSdk.Address(params.landlord).toScVal(),
        new StellarSdk.Address(params.tenant).toScVal(),
        params.agent
          ? xdr.ScVal.scvVec([new StellarSdk.Address(params.agent).toScVal()])
          : xdr.ScVal.scvVec([]),
        StellarSdk.nativeToScVal(BigInt(params.monthlyRent), { type: 'i128' }),
        StellarSdk.nativeToScVal(BigInt(params.securityDeposit), {
          type: 'i128',
        }),
        StellarSdk.nativeToScVal(params.startDate, { type: 'u64' }),
        StellarSdk.nativeToScVal(params.endDate, { type: 'u64' }),
        StellarSdk.nativeToScVal(params.agentCommissionRate, { type: 'u32' }),
        new StellarSdk.Address(params.paymentToken).toScVal(),
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
        `Failed to create agreement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async signAgreement(
    tenant: string,
    agreementId: string,
    tenantKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(tenant);

      const operation = this.contract.call(
        'sign_agreement',
        new StellarSdk.Address(tenant).toScVal(),
        xdr.ScVal.scvString(agreementId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(tenantKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to sign agreement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async submitAgreement(
    landlord: string,
    agreementId: string,
    landlordKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(landlord);

      const operation = this.contract.call(
        'submit_agreement',
        new StellarSdk.Address(landlord).toScVal(),
        xdr.ScVal.scvString(agreementId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(landlordKeypair);

      const result = await this.server.sendTransaction(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to submit agreement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async cancelAgreement(
    caller: string,
    agreementId: string,
    callerKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      const account = await this.server.getAccount(caller);

      const operation = this.contract.call(
        'cancel_agreement',
        new StellarSdk.Address(caller).toScVal(),
        xdr.ScVal.scvString(agreementId),
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
        `Failed to cancel agreement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getAgreement(agreementId: string): Promise<any> {
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
        'get_agreement',
        xdr.ScVal.scvString(agreementId),
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
        return this.parseAgreementResult(simulated.result.retval);
      }

      throw new Error('Failed to get agreement');
    } catch (error) {
      this.logger.error(
        `Failed to get agreement: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async hasAgreement(agreementId: string): Promise<boolean> {
    try {
      if (!this.isConfigured || !this.contract) {
        return false;
      }
      if (!this.adminKeypair) {
        return false;
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'has_agreement',
        xdr.ScVal.scvString(agreementId),
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
        return StellarSdk.scValToNative(simulated.result.retval);
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to check agreement: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async getAgreementCount(): Promise<number> {
    try {
      if (!this.isConfigured || !this.contract) {
        return 0;
      }
      if (!this.adminKeypair) {
        return 0;
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call('get_agreement_count');

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return StellarSdk.scValToNative(simulated.result.retval);
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Failed to get agreement count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  async getPaymentSplit(
    agreementId: string,
    month: number,
  ): Promise<PaymentSplit> {
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
        'get_payment_split',
        xdr.ScVal.scvString(agreementId),
        StellarSdk.nativeToScVal(month, { type: 'u32' }),
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
        return this.parsePaymentSplit(simulated.result.retval);
      }

      throw new Error('Failed to get payment split');
    } catch (error) {
      this.logger.error(
        `Failed to get payment split: ${error.message}`,
        error.stack,
      );
      throw error;
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

  private parseAgreementResult(result: xdr.ScVal): any {
    const native = StellarSdk.scValToNative(result);
    return native;
  }

  private parsePaymentSplit(result: xdr.ScVal): PaymentSplit {
    const native = StellarSdk.scValToNative(result);
    return {
      landlordAmount: native.landlord_amount?.toString() || '0',
      agentAmount: native.agent_amount?.toString() || '0',
      totalAmount: native.total_amount?.toString() || '0',
    };
  }
}
