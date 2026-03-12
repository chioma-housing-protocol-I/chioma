import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';

import type { DisputeOutcome } from './dispute-contract.service';
import type {
  ConditionValidationResult,
  EscrowConditionDto,
} from '../dto/escrow-enhanced.dto';

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

  // ==================== Core Escrow Operations ====================

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

  /**
   * Get approval count for a specific release target.
   * This wraps the `get_approval_count` view function in the Soroban contract.
   */
  async getApprovalCount(
    escrowId: string,
    releaseTo: string,
  ): Promise<number | null> {
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
        'get_approval_count',
        xdr.ScVal.scvBytes(Buffer.from(escrowId, 'hex')),
        new StellarSdk.Address(releaseTo).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (
        SorobanRpc.Api.isSimulationSuccess(simulated) &&
        simulated.result?.retval
      ) {
        const native = StellarSdk.scValToNative(simulated.result.retval);
        return typeof native === 'number' ? native : Number(native);
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get approval count: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  // ==================== Enhanced Escrow Operations (API surface) ====================

  /**
   * High-level helper for creating a multi-signature escrow.
   * Note: The underlying Soroban contract currently implements a 2-of-3
   * depositor/beneficiary/arbiter approval model; the requiredSignatures
   * parameter is accepted for future flexibility but not fully enforced here.
   */
  async createMultiSigEscrow(
    participants: string[],
    requiredSignatures: number,
    amount: string,
    token?: string,
  ): Promise<string> {
    if (participants.length < 3) {
      throw new Error('At least 3 participants are required for multi-sig');
    }
    if (requiredSignatures < 1) {
      throw new Error('requiredSignatures must be at least 1');
    }

    const [depositor, beneficiary, arbiter] = participants;
    const tokenAddress =
      token || this.configService.get<string>('ESCROW_TOKEN_CONTRACT_ID') || '';

    return this.createEscrow({
      depositor,
      beneficiary,
      arbiter,
      amount,
      token: tokenAddress,
    });
  }

  /**
   * Record an off-chain signature associated with an escrow.
   * This is a placeholder surface for future persistence integration and
   * does not modify on-chain state directly.
   */
  async addSignature(
    escrowId: string,
    signerAddress: string,
    signature: string,
  ): Promise<string> {
    this.logger.log(
      `Received signature for escrow ${escrowId} from ${signerAddress}`,
    );
    this.logger.debug(`Signature payload: ${signature}`);
    // In a future iteration, this method will persist the signature using
    // the EscrowSignature entity and coordinate with release logic.
    return escrowId;
  }

  /**
   * Placeholder API surface for releasing funds once sufficient signatures have
   * been collected. The concrete orchestration of multi-party approvals is left
   * for a future iteration and higher-level service.
   */
  async releaseWithSignatures(
    escrowId: string,
    _signatures: string[],
  ): Promise<string> {
    throw new Error(
      `releaseWithSignatures is not fully implemented yet for escrow ${escrowId}`,
    );
  }

  /**
   * Helper for creating an escrow with a time-based release constraint.
   * This method currently delegates to createEscrow; enforcement of the
   * releaseTime is expected to be handled by higher-level services that
   * combine on-chain state with off-chain scheduling.
   */
  async createTimeLockedEscrow(
    beneficiary: string,
    amount: string,
    releaseTime: number,
    token?: string,
  ): Promise<string> {
    const depositor =
      this.configService.get<string>('ESCROW_TIMELOCK_DEPOSITOR') || '';
    const arbiter =
      this.configService.get<string>('ESCROW_TIMELOCK_ARBITER') || depositor;

    if (!depositor) {
      throw new Error(
        'ESCROW_TIMELOCK_DEPOSITOR is not configured for time-locked escrows',
      );
    }

    if (releaseTime <= 0) {
      throw new Error('releaseTime must be a positive Unix timestamp');
    }

    const tokenAddress =
      token || this.configService.get<string>('ESCROW_TOKEN_CONTRACT_ID') || '';

    this.logger.log(
      `Creating time-locked escrow until ${releaseTime} for beneficiary ${beneficiary}`,
    );

    return this.createEscrow({
      depositor,
      beneficiary,
      arbiter,
      amount,
      token: tokenAddress,
    });
  }

  /**
   * Check time-lock conditions for an escrow.
   * Currently this is a lightweight helper that compares the provided
   * releaseTime with the current time; wiring to persistent state is expected
   * to be handled by higher-level services.
   */
  async checkTimeLockConditions(releaseTime: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    return now >= releaseTime;
  }

  /**
   * Placeholder for creating an escrow with arbitrary business conditions.
   * The actual encoding and enforcement of conditions will be implemented
   * in a dedicated orchestration layer.
   */
  async createConditionalEscrow(
    _conditions: EscrowConditionDto[],
    beneficiary: string,
    amount: string,
    token?: string,
  ): Promise<string> {
    const depositor =
      this.configService.get<string>('ESCROW_CONDITIONAL_DEPOSITOR') || '';
    const arbiter =
      this.configService.get<string>('ESCROW_CONDITIONAL_ARBITER') || depositor;

    if (!depositor) {
      throw new Error(
        'ESCROW_CONDITIONAL_DEPOSITOR is not configured for conditional escrows',
      );
    }

    const tokenAddress =
      token || this.configService.get<string>('ESCROW_TOKEN_CONTRACT_ID') || '';

    this.logger.log(
      `Creating conditional escrow for beneficiary ${beneficiary} with amount ${amount}`,
    );

    return this.createEscrow({
      depositor,
      beneficiary,
      arbiter,
      amount,
      token: tokenAddress,
    });
  }

  /**
   * Basic validation helper that always reports conditions as valid.
   * This is intentionally conservative until richer condition evaluation
   * is introduced.
   */
  async validateConditions(
    _escrowId: string,
    conditions: EscrowConditionDto[],
  ): Promise<ConditionValidationResult> {
    return {
      valid: true,
      failedConditions: conditions.length ? [] : [],
    };
  }

  /**
   * Attach metadata linking an on-chain escrow to an off-chain dispute.
   * Integration with the dedicated Dispute contract is expected to happen
   * in a higher-level service.
   */
  async integrateWithDispute(
    escrowId: string,
    disputeId: string,
  ): Promise<string> {
    this.logger.log(
      `Linking escrow ${escrowId} with dispute ${disputeId} (off-chain integration)`,
    );
    return escrowId;
  }

  /**
   * Helper to orchestrate escrow release decisions after a dispute has been
   * resolved. The concrete mapping between dispute outcome and release target
   * is intentionally deferred to a higher-level coordination service.
   */
  async releaseOnDisputeResolution(
    escrowId: string,
    disputeOutcome: DisputeOutcome,
  ): Promise<string> {
    this.logger.log(
      `Received dispute outcome ${disputeOutcome} for escrow ${escrowId}`,
    );
    throw new Error(
      `releaseOnDisputeResolution is not fully implemented yet for escrow ${escrowId}`,
    );
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
