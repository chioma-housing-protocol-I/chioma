import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { StellarEscrow, EscrowStatus } from '../entities/stellar-escrow.entity';
import { EscrowSignature } from '../entities/escrow-signature.entity';
import {
  EscrowCondition,
  ConditionType,
} from '../entities/escrow-condition.entity';
import {
  CreateMultiSigEscrowDto,
  AddSignatureDto,
  CreateTimeLockedEscrowDto,
  CreateConditionalEscrowDto,
  ConditionValidationResult,
  EscrowConditionsStatusDto,
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

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(StellarEscrow)
    private readonly escrowRepository: Repository<StellarEscrow>,
    @InjectRepository(EscrowSignature)
    private readonly signatureRepository: Repository<EscrowSignature>,
    @InjectRepository(EscrowCondition)
    private readonly conditionRepository: Repository<EscrowCondition>,
  ) {
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

  // ==================== Multi-Signature Support ====================

  async createMultiSigEscrow(dto: CreateMultiSigEscrowDto): Promise<string> {
    try {
      this.logger.log(
        `Creating multi-sig escrow with ${dto.requiredSignatures}/${dto.participants.length} signatures`,
      );

      if (dto.requiredSignatures > dto.participants.length) {
        throw new Error(
          'Required signatures cannot exceed number of participants',
        );
      }

      const defaultToken =
        dto.token || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
      const defaultArbiter =
        dto.arbiter || this.adminKeypair?.publicKey() || dto.participants[0];

      const escrowId = await this.createEscrow({
        depositor: dto.participants[0],
        beneficiary: dto.participants[1] || dto.participants[0],
        arbiter: defaultArbiter,
        amount: dto.amount,
        token: defaultToken,
      });

      // Store multi-sig metadata in database
      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
      });

      if (escrow) {
        escrow.isMultiSig = true;
        escrow.requiredSignatures = dto.requiredSignatures;
        escrow.participants = dto.participants;
        escrow.escrowMetadata = {
          ...escrow.escrowMetadata,
          description: dto.description,
          multiSigConfig: {
            participants: dto.participants,
            requiredSignatures: dto.requiredSignatures,
          },
        };
        await this.escrowRepository.save(escrow);
      }

      return escrowId;
    } catch (error) {
      this.logger.error(
        `Failed to create multi-sig escrow: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addSignature(dto: AddSignatureDto): Promise<string> {
    try {
      this.logger.log(
        `Adding signature from ${dto.signerAddress} to escrow ${dto.escrowId}`,
      );

      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: dto.escrowId },
        relations: ['signatures'],
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (!escrow.isMultiSig) {
        throw new Error('Escrow is not configured for multi-signature');
      }

      // Check if signer is a participant
      if (!escrow.participants?.includes(dto.signerAddress)) {
        throw new Error('Signer is not a participant in this escrow');
      }

      // Check for duplicate signature
      const existingSignature = await this.signatureRepository.findOne({
        where: {
          escrowId: escrow.id,
          signerAddress: dto.signerAddress,
        },
      });

      if (existingSignature) {
        throw new Error('Signer has already signed this escrow');
      }

      // Create signature record
      const signature = this.signatureRepository.create({
        escrowId: escrow.id,
        signerAddress: dto.signerAddress,
        signature: dto.signature,
        isValid: true,
        signatureType: 'release',
        metadata: dto.metadata,
      });

      await this.signatureRepository.save(signature);

      // Update approval count
      escrow.approvalCount = (escrow.approvalCount || 0) + 1;
      await this.escrowRepository.save(escrow);

      return `Signature added. ${escrow.approvalCount}/${escrow.requiredSignatures} signatures collected`;
    } catch (error) {
      this.logger.error(
        `Failed to add signature: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async releaseWithSignatures(
    escrowId: string,
    signatures: string[],
  ): Promise<string> {
    try {
      this.logger.log(
        `Releasing escrow ${escrowId} with ${signatures.length} signatures`,
      );

      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
        relations: ['signatures'],
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (!escrow.isMultiSig) {
        throw new Error('Escrow is not configured for multi-signature');
      }

      const validSignatures = escrow.signatures?.filter((s) => s.isValid) || [];

      if (validSignatures.length < escrow.requiredSignatures) {
        throw new Error(
          `Insufficient signatures: ${validSignatures.length}/${escrow.requiredSignatures}`,
        );
      }

      // Execute release on blockchain
      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }

      const txHash = await this.approveRelease(
        escrowId,
        this.adminKeypair.publicKey(),
        escrow.destinationAccount?.publicKey || '',
        this.adminKeypair,
      );

      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.releaseTransactionHash = txHash;
      await this.escrowRepository.save(escrow);

      return txHash;
    } catch (error) {
      this.logger.error(
        `Failed to release with signatures: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Time-Locked Escrow ====================

  async createTimeLockedEscrow(
    dto: CreateTimeLockedEscrowDto,
  ): Promise<string> {
    try {
      this.logger.log(
        `Creating time-locked escrow with release time ${dto.releaseTime}`,
      );

      const currentTime = Math.floor(Date.now() / 1000);
      if (dto.releaseTime <= currentTime) {
        throw new Error('Release time must be in the future');
      }

      const defaultToken =
        dto.token || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
      const defaultDepositor =
        dto.depositor || this.adminKeypair?.publicKey() || dto.beneficiary;
      const defaultArbiter =
        dto.arbiter || this.adminKeypair?.publicKey() || dto.beneficiary;

      const escrowId = await this.createEscrow({
        depositor: defaultDepositor,
        beneficiary: dto.beneficiary,
        arbiter: defaultArbiter,
        amount: dto.amount,
        token: defaultToken,
      });

      // Store time-lock metadata
      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
      });

      if (escrow) {
        escrow.isTimeLocked = true;
        escrow.releaseTime = dto.releaseTime;
        escrow.escrowMetadata = {
          ...escrow.escrowMetadata,
          timeLockConfig: {
            releaseTime: dto.releaseTime,
            releaseDate: new Date(dto.releaseTime * 1000).toISOString(),
          },
        };
        await this.escrowRepository.save(escrow);

        // Create time-lock condition
        const condition = this.conditionRepository.create({
          escrowId: escrow.id,
          conditionType: ConditionType.TIME_LOCK,
          parameters: {
            releaseTime: dto.releaseTime,
          },
          satisfied: false,
          required: true,
          description: `Funds locked until ${new Date(dto.releaseTime * 1000).toISOString()}`,
        });
        await this.conditionRepository.save(condition);
      }

      return escrowId;
    } catch (error) {
      this.logger.error(
        `Failed to create time-locked escrow: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async checkTimeLockConditions(escrowId: string): Promise<boolean> {
    try {
      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
        relations: ['conditions'],
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (!escrow.isTimeLocked) {
        return true; // Not time-locked, always ready
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const isUnlocked = escrow.releaseTime
        ? currentTime >= escrow.releaseTime
        : false;

      // Update time-lock condition if unlocked
      if (isUnlocked) {
        const timeLockCondition = escrow.conditions?.find(
          (c) => c.conditionType === ConditionType.TIME_LOCK,
        );

        if (timeLockCondition && !timeLockCondition.satisfied) {
          timeLockCondition.satisfied = true;
          timeLockCondition.satisfiedAt = new Date();
          await this.conditionRepository.save(timeLockCondition);
        }
      }

      return isUnlocked;
    } catch (error) {
      this.logger.error(
        `Failed to check time-lock conditions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Conditional Escrow ====================

  async createConditionalEscrow(
    dto: CreateConditionalEscrowDto,
  ): Promise<string> {
    try {
      this.logger.log(
        `Creating conditional escrow with ${dto.conditions.length} conditions`,
      );

      const defaultToken =
        dto.token || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
      const defaultDepositor =
        dto.depositor || this.adminKeypair?.publicKey() || dto.beneficiary;
      const defaultArbiter =
        dto.arbiter || this.adminKeypair?.publicKey() || dto.beneficiary;

      const escrowId = await this.createEscrow({
        depositor: defaultDepositor,
        beneficiary: dto.beneficiary,
        arbiter: defaultArbiter,
        amount: dto.amount,
        token: defaultToken,
      });

      // Store conditions in database
      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
      });

      if (escrow) {
        const conditions = dto.conditions.map((c) =>
          this.conditionRepository.create({
            escrowId: escrow.id,
            conditionType: c.type,
            parameters: c.parameters,
            satisfied: false,
            required: c.required,
            description: c.description,
          }),
        );

        await this.conditionRepository.save(conditions);

        escrow.escrowMetadata = {
          ...escrow.escrowMetadata,
          conditionalConfig: {
            totalConditions: dto.conditions.length,
            requiredConditions: dto.conditions.filter((c) => c.required).length,
          },
        };
        await this.escrowRepository.save(escrow);
      }

      return escrowId;
    } catch (error) {
      this.logger.error(
        `Failed to create conditional escrow: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async validateConditions(
    escrowId: string,
  ): Promise<EscrowConditionsStatusDto> {
    try {
      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
        relations: ['conditions'],
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      const conditions: ConditionValidationResult[] =
        escrow.conditions?.map((c) => ({
          conditionId: c.id,
          type: c.conditionType,
          satisfied: c.satisfied,
          required: c.required,
          description: c.description,
          validationDetails: c.validationResult || undefined,
        })) || [];

      const requiredConditions = conditions.filter((c) => c.required);
      const requiredConditionsMet = requiredConditions.every(
        (c) => c.satisfied,
      );
      const allConditionsMet = conditions.every((c) => c.satisfied);

      return {
        escrowId,
        allConditionsMet,
        requiredConditionsMet,
        conditions,
        canRelease: requiredConditionsMet,
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate conditions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Dispute Integration ====================

  async integrateWithDispute(
    escrowId: string,
    disputeId: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Integrating escrow ${escrowId} with dispute ${disputeId}`,
      );

      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      escrow.linkedDisputeId = disputeId;
      escrow.disputeIntegrated = true;
      escrow.disputeId = disputeId;
      await this.escrowRepository.save(escrow);

      // Create dispute resolution condition
      const condition = this.conditionRepository.create({
        escrowId: escrow.id,
        conditionType: ConditionType.DISPUTE_RESOLUTION,
        parameters: {
          disputeId,
        },
        satisfied: false,
        required: true,
        description: `Awaiting resolution of dispute ${disputeId}`,
      });
      await this.conditionRepository.save(condition);

      return `Escrow ${escrowId} integrated with dispute ${disputeId}`;
    } catch (error) {
      this.logger.error(
        `Failed to integrate with dispute: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async releaseOnDisputeResolution(
    escrowId: string,
    disputeOutcome: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Releasing escrow ${escrowId} based on dispute outcome: ${disputeOutcome}`,
      );

      const escrow = await this.escrowRepository.findOne({
        where: { blockchainEscrowId: escrowId },
        relations: ['conditions', 'sourceAccount', 'destinationAccount'],
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (!escrow.disputeIntegrated) {
        throw new Error('Escrow is not integrated with a dispute');
      }

      // Update dispute resolution condition
      const disputeCondition = escrow.conditions?.find(
        (c) => c.conditionType === ConditionType.DISPUTE_RESOLUTION,
      );

      if (disputeCondition) {
        disputeCondition.satisfied = true;
        disputeCondition.satisfiedAt = new Date();
        disputeCondition.validationResult = {
          outcome: disputeOutcome,
          resolvedAt: new Date().toISOString(),
        };
        await this.conditionRepository.save(disputeCondition);
      }

      // Determine release target based on outcome
      const releaseTo =
        disputeOutcome === 'FavorLandlord'
          ? escrow.destinationAccount?.publicKey
          : escrow.sourceAccount?.publicKey;

      if (!releaseTo || !this.adminKeypair) {
        throw new Error(
          'Cannot determine release target or admin not configured',
        );
      }

      // Execute release
      const txHash = await this.approveRelease(
        escrowId,
        this.adminKeypair.publicKey(),
        releaseTo,
        this.adminKeypair,
      );

      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      escrow.releaseTransactionHash = txHash;
      escrow.escrowMetadata = {
        ...escrow.escrowMetadata,
        disputeResolution: {
          outcome: disputeOutcome,
          resolvedAt: new Date().toISOString(),
        },
      };
      await this.escrowRepository.save(escrow);

      return txHash;
    } catch (error) {
      this.logger.error(
        `Failed to release on dispute resolution: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
