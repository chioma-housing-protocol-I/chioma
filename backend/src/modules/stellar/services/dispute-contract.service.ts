import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Arbiter } from '../entities/arbiter.entity';
import { DisputeVote } from '../entities/dispute-vote.entity';
import { DisputeEvent, DisputeEventType } from '../entities/dispute-event.entity';
import { 
  RegisterArbiterDto, 
  TrackVoteDto, 
  EnforceResolutionDto, 
  SelectArbitersDto,
  VoteResults,
  ReputationScore,
  DisputeTimelineEvent,
  ArbiterInfo
} from '../dto/dispute-enhanced.dto';

export enum DisputeOutcome {
  FAVOR_LANDLORD = 'FavorLandlord',
  FAVOR_TENANT = 'FavorTenant',
}

export interface DisputeInfo {
  agreementId: string;
  detailsHash: string;
  raisedAt: number;
  resolved: boolean;
  resolvedAt?: number;
  votesFavorLandlord: number;
  votesFavorTenant: number;
  outcome?: DisputeOutcome;
}

export interface VoteInfo {
  arbiter: string;
  agreementId: string;
  favorLandlord: boolean;
  votedAt: number;
}

@Injectable()
export class DisputeContractService {
  private readonly logger = new Logger(DisputeContractService.name);
  private readonly contractId: string;
  private readonly rpcUrl: string;
  private readonly network: string;
  private readonly adminKeypair?: StellarSdk.Keypair;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Arbiter)
    private arbiterRepository: Repository<Arbiter>,
    @InjectRepository(DisputeVote)
    private disputeVoteRepository: Repository<DisputeVote>,
    @InjectRepository(DisputeEvent)
    private disputeEventRepository: Repository<DisputeEvent>,
  ) {
    this.contractId =
      this.configService.get<string>('DISPUTE_CONTRACT_ID') || '';
    this.rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    this.network = this.configService.get<string>('STELLAR_NETWORK', 'testnet');

    const adminSecret = this.configService.get<string>(
      'STELLAR_ADMIN_SECRET_KEY',
    );
    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  async addArbiter(arbiterAddress: string): Promise<string> {
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not configured');
    }

    this.logger.log(`Adding arbiter: ${arbiterAddress}`);

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'add_arbiter',
          StellarSdk.Address.fromString(
            this.adminKeypair.publicKey(),
          ).toScVal(),
          StellarSdk.Address.fromString(arbiterAddress).toScVal(),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(this.adminKeypair);

    const result = await server.sendTransaction(prepared);
    return result.hash;
  }

  async raiseDispute(
    raiserAddress: string,
    agreementId: string,
    detailsHash: string,
  ): Promise<string> {
    this.logger.log(`Raising dispute for agreement: ${agreementId}`);

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const raiserKeypair = StellarSdk.Keypair.fromSecret(raiserAddress);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(raiserKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'raise_dispute',
          StellarSdk.Address.fromString(raiserKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(agreementId, { type: 'string' }),
          StellarSdk.nativeToScVal(detailsHash, { type: 'string' }),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(raiserKeypair);

    const result = await server.sendTransaction(prepared);
    return result.hash;
  }

  async voteOnDispute(
    arbiterAddress: string,
    agreementId: string,
    favorLandlord: boolean,
  ): Promise<string> {
    this.logger.log(`Arbiter voting on dispute: ${agreementId}`);

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const arbiterKeypair = StellarSdk.Keypair.fromSecret(arbiterAddress);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(arbiterKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'vote_on_dispute',
          StellarSdk.Address.fromString(arbiterKeypair.publicKey()).toScVal(),
          StellarSdk.nativeToScVal(agreementId, { type: 'string' }),
          StellarSdk.nativeToScVal(favorLandlord, { type: 'bool' }),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(arbiterKeypair);

    const result = await server.sendTransaction(prepared);
    return result.hash;
  }

  async resolveDispute(
    agreementId: string,
  ): Promise<{ outcome: DisputeOutcome; txHash: string }> {
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not configured');
    }

    this.logger.log(`Resolving dispute: ${agreementId}`);

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'resolve_dispute',
          StellarSdk.nativeToScVal(agreementId, { type: 'string' }),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    prepared.sign(this.adminKeypair);

    const result = await server.sendTransaction(prepared);

    const outcome = await this.getDisputeOutcome(agreementId);
    return { outcome, txHash: result.hash };
  }

  async getDispute(agreementId: string): Promise<DisputeInfo | null> {
    if (!this.adminKeypair) {
      return null;
    }

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'get_dispute',
          StellarSdk.nativeToScVal(agreementId, { type: 'string' }),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const simulated = await server.simulateTransaction(prepared);

    if (
      StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) &&
      simulated.result?.retval
    ) {
      return this.parseDisputeInfo(simulated.result.retval);
    }

    return null;
  }

  async getArbiter(arbiterAddress: string): Promise<ArbiterInfo | null> {
    if (!this.adminKeypair) {
      return null;
    }

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'get_arbiter',
          StellarSdk.Address.fromString(arbiterAddress).toScVal(),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const simulated = await server.simulateTransaction(prepared);

    if (
      StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) &&
      simulated.result?.retval
    ) {
      return this.parseArbiterInfo(simulated.result.retval);
    }

    return null;
  }

  async getArbiterCount(): Promise<number> {
    if (!this.adminKeypair) {
      return 0;
    }

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(contract.call('get_arbiter_count'))
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const simulated = await server.simulateTransaction(prepared);

    if (
      StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) &&
      simulated.result?.retval
    ) {
      return StellarSdk.scValToNative(simulated.result.retval);
    }

    return 0;
  }

  async getVote(
    agreementId: string,
    arbiterAddress: string,
  ): Promise<VoteInfo | null> {
    if (!this.adminKeypair) {
      return null;
    }

    const server = new StellarSdk.SorobanRpc.Server(this.rpcUrl);
    const contract = new StellarSdk.Contract(this.contractId);

    const tx = new StellarSdk.TransactionBuilder(
      await server.getAccount(this.adminKeypair.publicKey()),
      {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.getNetworkPassphrase(),
      },
    )
      .addOperation(
        contract.call(
          'get_vote',
          StellarSdk.nativeToScVal(agreementId, { type: 'string' }),
          StellarSdk.Address.fromString(arbiterAddress).toScVal(),
        ),
      )
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const simulated = await server.simulateTransaction(prepared);

    if (
      StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated) &&
      simulated.result?.retval
    ) {
      return this.parseVoteInfo(simulated.result.retval);
    }

    return null;
  }

  private async getDisputeOutcome(
    agreementId: string,
  ): Promise<DisputeOutcome> {
    const dispute = await this.getDispute(agreementId);
    if (!dispute || !dispute.outcome) {
      throw new Error('Dispute not resolved');
    }
    return dispute.outcome;
  }

  private parseDisputeInfo(result: any): DisputeInfo {
    const native = StellarSdk.scValToNative(result.retval);
    return {
      agreementId: native.agreement_id,
      detailsHash: native.details_hash,
      raisedAt: native.raised_at,
      resolved: native.resolved,
      resolvedAt: native.resolved_at,
      votesFavorLandlord: native.votes_favor_landlord,
      votesFavorTenant: native.votes_favor_tenant,
      outcome:
        native.votes_favor_landlord > native.votes_favor_tenant
          ? DisputeOutcome.FAVOR_LANDLORD
          : DisputeOutcome.FAVOR_TENANT,
    };
  }

  private parseArbiterInfo(result: any): ArbiterInfo {
    const native = StellarSdk.scValToNative(result);
    return {
      address: native.address,
      qualifications: native.qualifications || '',
      specialization: native.specialization,
      stakeAmount: native.stake_amount || '0',
      isActive: native.active || true,
      reputationScore: native.reputation_score || 0,
      totalDisputes: native.total_disputes || 0,
      successfulResolutions: native.successful_resolutions || 0,
      registeredAt: new Date(native.registered_at * 1000 || Date.now()),
      lastActiveAt: new Date(native.last_active_at * 1000 || Date.now()),
    };
  }

  private parseVoteInfo(result: any): VoteInfo {
    const native = StellarSdk.scValToNative(result.retval);
    return {
      arbiter: native.arbiter,
      agreementId: native.agreement_id,
      favorLandlord: native.favor_landlord,
      votedAt: native.voted_at,
    };
  }

  private getNetworkPassphrase(): string {
    return this.network === 'mainnet'
      ? StellarSdk.Networks.PUBLIC
      : StellarSdk.Networks.TESTNET;
  }

  // ==================== Enhanced Dispute Functions ====================

  async registerArbiter(arbiterAddress: string, qualifications: string, stakeAmount: string): Promise<string> {
    this.logger.log(`Registering arbiter: ${arbiterAddress}`);

    // Call existing addArbiter method
    const txHash = await this.addArbiter(arbiterAddress);

    // Save to database
    const arbiter = this.arbiterRepository.create({
      address: arbiterAddress,
      qualifications,
      stakeAmount,
      isActive: true,
      reputationScore: 0,
      totalDisputes: 0,
      successfulResolutions: 0,
      registeredAt: new Date(),
      lastActiveAt: new Date(),
    });

    await this.arbiterRepository.save(arbiter);

    // Log event
    await this.logDisputeEvent(arbiterAddress, DisputeEventType.ARBITERS_SELECTED, 
      JSON.stringify({ arbiterAddress, qualifications, stakeAmount }));

    return txHash;
  }

  async deregisterArbiter(arbiterAddress: string): Promise<string> {
    this.logger.log(`Deregistering arbiter: ${arbiterAddress}`);

    // Update database
    await this.arbiterRepository.update(
      { address: arbiterAddress },
      { isActive: false, lastActiveAt: new Date() }
    );

    // Log event
    await this.logDisputeEvent(arbiterAddress, DisputeEventType.RESOLUTION_ENFORCED, 
      JSON.stringify({ arbiterAddress, action: 'deregistered' }));

    return `Arbiter ${arbiterAddress} deregistered successfully`;
  }

  async getArbiterPool(): Promise<ArbiterInfo[]> {
    const arbiters = await this.arbiterRepository.find({
      where: { isActive: true },
      order: { reputationScore: 'DESC' }
    });

    return arbiters.map(arbiter => ({
      address: arbiter.address,
      qualifications: arbiter.qualifications,
      specialization: arbiter.specialization,
      stakeAmount: arbiter.stakeAmount,
      isActive: arbiter.isActive,
      reputationScore: arbiter.reputationScore,
      totalDisputes: arbiter.totalDisputes,
      successfulResolutions: arbiter.successfulResolutions,
      registeredAt: arbiter.registeredAt,
      lastActiveAt: arbiter.lastActiveAt,
    }));
  }

  async selectArbitersForDispute(disputeId: string, count: number): Promise<string[]> {
    this.logger.log(`Selecting ${count} arbiters for dispute: ${disputeId}`);

    const availableArbiters = await this.arbiterRepository.find({
      where: { isActive: true },
      order: { reputationScore: 'DESC' }
    });

    if (availableArbiters.length < count) {
      throw new Error(`Insufficient arbiters available. Required: ${count}, Available: ${availableArbiters.length}`);
    }

    // Simple selection - top reputation arbiters
    const selectedArbiters = availableArbiters.slice(0, count).map(arbiter => arbiter.address);

    // Log event
    await this.logDisputeEvent(disputeId, DisputeEventType.ARBITERS_SELECTED, 
      JSON.stringify({ selectedArbiters, count }));

    return selectedArbiters;
  }

  async trackVote(disputeId: string, arbiterAddress: string, vote: boolean, evidence: string): Promise<string> {
    this.logger.log(`Tracking vote for dispute: ${disputeId} by arbiter: ${arbiterAddress}`);

    // Call existing voteOnDispute method
    const txHash = await this.voteOnDispute(arbiterAddress, disputeId, vote);

    // Save to database
    const disputeVote = this.disputeVoteRepository.create({
      disputeId,
      arbiterAddress,
      vote,
      evidence,
      votedAt: new Date(),
      transactionHash: txHash,
    });

    await this.disputeVoteRepository.save(disputeVote);

    // Update arbiter stats
    await this.arbiterRepository.increment(
      { address: arbiterAddress },
      'totalDisputes', 1
    );

    // Log event
    await this.logDisputeEvent(arbiterAddress, DisputeEventType.VOTE_CAST, 
      JSON.stringify({ disputeId, arbiterAddress, vote, evidence }));

    return txHash;
  }

  async getVoteResults(disputeId: string): Promise<VoteResults> {
    const votes = await this.disputeVoteRepository.find({
      where: { disputeId }
    });

    const votesFavorLandlord = votes.filter(v => v.vote).length;
    const votesFavorTenant = votes.filter(v => !v.vote).length;
    const totalVotes = votes.length;

    const contractDispute = await this.getDispute(disputeId);
    const isComplete = contractDispute?.resolved || false;

    let outcome: DisputeOutcome | undefined;
    if (isComplete && contractDispute) {
      outcome = contractDispute.outcome;
    }

    return {
      votesFavorLandlord,
      votesFavorTenant,
      totalVotes,
      outcome,
      isComplete
    };
  }

  async enforceDisputeResolution(disputeId: string, outcome: DisputeOutcome): Promise<string> {
    this.logger.log(`Enforcing resolution for dispute: ${disputeId} with outcome: ${outcome}`);

    // Call existing resolveDispute method
    const result = await this.resolveDispute(disputeId);

    // Update arbiter stats based on outcome
    const votes = await this.disputeVoteRepository.find({ where: { disputeId } });
    const winningArbiters = votes.filter(vote => {
      return (outcome === DisputeOutcome.FAVOR_LANDLORD && vote.vote) ||
             (outcome === DisputeOutcome.FAVOR_TENANT && !vote.vote);
    });

    // Increment successful resolutions for winning arbiters
    for (const arbiterVote of winningArbiters) {
      await this.arbiterRepository.increment(
        { address: arbiterVote.arbiterAddress },
        'successfulResolutions', 1
      );
    }

    // Log event
    await this.logDisputeEvent(disputeId, DisputeEventType.RESOLUTION_ENFORCED, 
      JSON.stringify({ disputeId, outcome, winningArbiters: winningArbiters.length }));

    return result.txHash;
  }

  async getDisputeTimeline(disputeId: string): Promise<DisputeTimelineEvent[]> {
    const events = await this.disputeEventRepository.find({
      where: { disputeId },
      order: { timestamp: 'ASC' }
    });

    return events.map(event => ({
      id: event.id,
      disputeId: event.disputeId,
      eventType: event.eventType,
      eventData: event.eventData,
      timestamp: event.timestamp,
      triggeredBy: event.triggeredBy,
    }));
  }

  async calculateArbiterReputation(arbiterAddress: string): Promise<ReputationScore> {
    const arbiter = await this.arbiterRepository.findOne({ 
      where: { address: arbiterAddress } 
    });

    if (!arbiter) {
      throw new Error(`Arbiter not found: ${arbiterAddress}`);
    }

    const successRate = arbiter.totalDisputes > 0 
      ? (arbiter.successfulResolutions / arbiter.totalDisputes) * 100 
      : 0;

    return {
      score: arbiter.reputationScore,
      totalDisputes: arbiter.totalDisputes,
      successfulResolutions: arbiter.successfulResolutions,
      successRate,
      isActive: arbiter.isActive
    };
  }

  private async logDisputeEvent(disputeId: string, eventType: DisputeEventType, eventData: string, triggeredBy?: string): Promise<void> {
    const event = this.disputeEventRepository.create({
      disputeId,
      eventType,
      eventData,
      timestamp: new Date(),
      triggeredBy,
    });

    await this.disputeEventRepository.save(event);
  }
}
