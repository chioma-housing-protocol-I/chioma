import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Arbiter } from '../../disputes/entities/arbiter.entity';
import { DisputeVote } from '../../disputes/entities/dispute-vote.entity';
import {
  DisputeEvent,
  DisputeEventType,
} from '../../disputes/entities/dispute-event.entity';
import { Dispute, DisputeStatus } from '../../disputes/entities/dispute.entity';
import {
  DisputeOutcome,
  ArbiterInfoDto,
  VoteResultsDto,
  DisputeTimelineDto,
  ReputationScoreDto,
  DisputeEnforcementResultDto,
} from '../dto/dispute-enhanced.dto';
import { DisputeContractService } from './dispute-contract.service';
import { EscrowContractService } from './escrow-contract.service';

@Injectable()
export class DisputeContractEnhancedService {
  private readonly logger = new Logger(DisputeContractEnhancedService.name);

  constructor(
    @InjectRepository(Arbiter)
    private arbiterRepository: Repository<Arbiter>,
    @InjectRepository(DisputeVote)
    private voteRepository: Repository<DisputeVote>,
    @InjectRepository(DisputeEvent)
    private eventRepository: Repository<DisputeEvent>,
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    private disputeContractService: DisputeContractService,
    private escrowContractService: EscrowContractService,
    private configService: ConfigService,
  ) {}

  // ==================== Arbiter Management ====================

  async registerArbiter(
    arbiterAddress: string,
    qualifications: string,
    stakeAmount: string,
    specialization?: string,
  ): Promise<string> {
    try {
      this.logger.log(`Registering arbiter: ${arbiterAddress}`);

      // Call blockchain contract
      const txHash =
        await this.disputeContractService.addArbiter(arbiterAddress);

      // Get blockchain timestamp
      const arbiterInfo =
        await this.disputeContractService.getArbiter(arbiterAddress);

      // Save to database
      const arbiter = this.arbiterRepository.create({
        stellarAddress: arbiterAddress,
        active: true,
        blockchainAddedAt: arbiterInfo?.addedAt || Date.now(),
        transactionHash: txHash,
        metadata: {
          qualifications,
          stakeAmount,
          specialization,
        },
      });

      await this.arbiterRepository.save(arbiter);

      this.logger.log(`Arbiter registered successfully: ${arbiterAddress}`);
      return txHash;
    } catch (error) {
      this.logger.error(
        `Failed to register arbiter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deregisterArbiter(arbiterAddress: string): Promise<string> {
    try {
      this.logger.log(`Deregistering arbiter: ${arbiterAddress}`);

      const arbiter = await this.arbiterRepository.findOne({
        where: { stellarAddress: arbiterAddress },
      });

      if (!arbiter) {
        throw new Error('Arbiter not found');
      }

      arbiter.active = false;
      await this.arbiterRepository.save(arbiter);

      return `Arbiter ${arbiterAddress} deregistered successfully`;
    } catch (error) {
      this.logger.error(
        `Failed to deregister arbiter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getArbiterPool(): Promise<ArbiterInfoDto[]> {
    try {
      const arbiters = await this.arbiterRepository.find({
        where: { active: true },
      });

      return arbiters.map((arbiter) => ({
        address: arbiter.stellarAddress,
        active: arbiter.active,
        addedAt: arbiter.blockchainAddedAt || 0,
        totalVotes: arbiter.totalVotes,
        totalDisputesResolved: arbiter.totalDisputesResolved,
        reputationScore: Number(arbiter.reputationScore),
        successfulResolutions: arbiter.successfulResolutions,
        qualifications: arbiter.metadata?.qualifications,
        specialization: arbiter.metadata?.specialization,
        stakeAmount: arbiter.metadata?.stakeAmount,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get arbiter pool: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async selectArbitersForDispute(
    disputeId: string,
    count: number,
    specialization?: string,
  ): Promise<string[]> {
    try {
      this.logger.log(`Selecting ${count} arbiters for dispute ${disputeId}`);

      let query = this.arbiterRepository
        .createQueryBuilder('arbiter')
        .where('arbiter.active = :active', { active: true });

      if (specialization) {
        query = query.andWhere(
          "arbiter.metadata->>'specialization' = :specialization",
          { specialization },
        );
      }

      const arbiters = await query
        .orderBy('arbiter.reputationScore', 'DESC')
        .addOrderBy('arbiter.totalDisputesResolved', 'DESC')
        .limit(count)
        .getMany();

      if (arbiters.length < count) {
        this.logger.warn(
          `Only ${arbiters.length} arbiters available, requested ${count}`,
        );
      }

      const selectedAddresses = arbiters.map((a) => a.stellarAddress);

      // Record event
      await this.recordDisputeEvent(
        disputeId,
        DisputeEventType.ARBITERS_SELECTED,
        { arbiters: selectedAddresses, count },
        null,
      );

      return selectedAddresses;
    } catch (error) {
      this.logger.error(
        `Failed to select arbiters: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Vote Tracking ====================

  async trackVote(
    disputeId: string,
    arbiterAddress: string,
    vote: boolean,
    evidence?: string,
    reasoning?: string,
  ): Promise<string> {
    try {
      this.logger.log(
        `Tracking vote for dispute ${disputeId} by ${arbiterAddress}`,
      );

      const arbiter = await this.arbiterRepository.findOne({
        where: { stellarAddress: arbiterAddress },
      });

      if (!arbiter) {
        throw new Error('Arbiter not found');
      }

      const dispute = await this.disputeRepository.findOne({
        where: { disputeId },
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Check if already voted
      const existingVote = await this.voteRepository.findOne({
        where: { disputeId: dispute.id, arbiterId: arbiter.id },
      });

      if (existingVote) {
        throw new Error('Arbiter has already voted on this dispute');
      }

      // Create vote record
      const voteRecord = this.voteRepository.create({
        disputeId: dispute.id,
        arbiterId: arbiter.id,
        favorLandlord: vote,
        evidence,
        reasoning,
        voteWeight: 1,
      });

      await this.voteRepository.save(voteRecord);

      // Update arbiter stats
      arbiter.totalVotes += 1;
      await this.arbiterRepository.save(arbiter);

      // Update dispute vote counts
      if (vote) {
        dispute.votesFavorLandlord += 1;
      } else {
        dispute.votesFavorTenant += 1;
      }
      await this.disputeRepository.save(dispute);

      // Record event
      await this.recordDisputeEvent(
        disputeId,
        DisputeEventType.VOTE_CAST,
        {
          arbiter: arbiterAddress,
          vote: vote ? 'landlord' : 'tenant',
          hasEvidence: !!evidence,
        },
        arbiterAddress,
      );

      return `Vote recorded successfully for dispute ${disputeId}`;
    } catch (error) {
      this.logger.error(`Failed to track vote: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVoteResults(disputeId: string): Promise<VoteResultsDto> {
    try {
      const dispute = await this.disputeRepository.findOne({
        where: { disputeId },
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      const votes = await this.voteRepository.find({
        where: { disputeId: dispute.id },
        relations: ['arbiter'],
      });

      const outcome =
        dispute.votesFavorLandlord > dispute.votesFavorTenant
          ? DisputeOutcome.FAVOR_LANDLORD
          : dispute.votesFavorTenant > dispute.votesFavorLandlord
            ? DisputeOutcome.FAVOR_TENANT
            : undefined;

      return {
        disputeId,
        votesFavorLandlord: dispute.votesFavorLandlord,
        votesFavorTenant: dispute.votesFavorTenant,
        totalVotes: votes.length,
        outcome,
        resolved: dispute.status === DisputeStatus.RESOLVED,
        votes: votes.map((v) => ({
          arbiterAddress: v.arbiter.stellarAddress,
          favorLandlord: v.favorLandlord,
          votedAt: v.createdAt,
          voteWeight: v.voteWeight,
          comment: v.comment || undefined,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get vote results: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Resolution Enforcement ====================

  async enforceDisputeResolution(
    disputeId: string,
    outcome: DisputeOutcome,
    enforcementAction?: string,
  ): Promise<DisputeEnforcementResultDto> {
    try {
      this.logger.log(`Enforcing resolution for dispute ${disputeId}`);

      const dispute = await this.disputeRepository.findOne({
        where: { disputeId },
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Resolve on blockchain
      const { txHash } = await this.disputeContractService.resolveDispute(
        dispute.blockchainAgreementId || disputeId,
      );

      // Update dispute status
      dispute.status = DisputeStatus.RESOLVED;
      dispute.blockchainOutcome = outcome;
      dispute.transactionHash = txHash;
      dispute.resolvedAt = new Date();
      dispute.blockchainResolvedAt = Date.now();
      await this.disputeRepository.save(dispute);

      // Update arbiter reputation
      await this.updateArbitersReputation(dispute.id, outcome);

      // Release escrow if linked
      let escrowReleased = false;
      let recipientAddress: string | undefined;

      if (dispute.metadata?.escrowId) {
        try {
          const releaseResult =
            await this.escrowContractService.releaseOnDisputeResolution(
              dispute.metadata.escrowId,
              outcome,
            );
          escrowReleased = true;
          this.logger.log(`Escrow released: ${releaseResult}`);
        } catch (error) {
          this.logger.warn(`Failed to release escrow: ${error.message}`);
        }
      }

      // Record event
      await this.recordDisputeEvent(
        disputeId,
        DisputeEventType.RESOLUTION_ENFORCED,
        {
          outcome,
          enforcementAction,
          escrowReleased,
        },
        null,
        txHash,
      );

      return {
        disputeId,
        outcome,
        transactionHash: txHash,
        enforcedAt: new Date(),
        escrowReleased,
        recipientAddress,
      };
    } catch (error) {
      this.logger.error(
        `Failed to enforce resolution: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== Timeline & Events ====================

  async getDisputeTimeline(disputeId: string): Promise<DisputeTimelineDto> {
    try {
      const events = await this.eventRepository.find({
        where: { disputeId },
        order: { timestamp: 'ASC' },
      });

      return {
        disputeId,
        events: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventData: e.eventData,
          timestamp: e.timestamp,
          triggeredBy: e.triggeredBy || undefined,
          transactionHash: e.transactionHash || undefined,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dispute timeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async recordDisputeEvent(
    disputeId: string,
    eventType: DisputeEventType,
    eventData: Record<string, any>,
    triggeredBy: string | null,
    transactionHash?: string,
  ): Promise<void> {
    const event = this.eventRepository.create({
      disputeId,
      eventType,
      eventData,
      timestamp: new Date(),
      triggeredBy,
      transactionHash: transactionHash || null,
    });

    await this.eventRepository.save(event);
  }

  // ==================== Reputation System ====================

  async calculateArbiterReputation(
    arbiterAddress: string,
  ): Promise<ReputationScoreDto> {
    try {
      const arbiter = await this.arbiterRepository.findOne({
        where: { stellarAddress: arbiterAddress },
      });

      if (!arbiter) {
        throw new Error('Arbiter not found');
      }

      const successRate =
        arbiter.totalDisputesResolved > 0
          ? (arbiter.successfulResolutions / arbiter.totalDisputesResolved) *
            100
          : 0;

      return {
        arbiterAddress,
        reputationScore: Number(arbiter.reputationScore),
        totalVotes: arbiter.totalVotes,
        totalDisputesResolved: arbiter.totalDisputesResolved,
        successfulResolutions: arbiter.successfulResolutions,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate reputation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async updateArbitersReputation(
    disputeId: number,
    outcome: DisputeOutcome,
  ): Promise<void> {
    try {
      const votes = await this.voteRepository.find({
        where: { disputeId },
        relations: ['arbiter'],
      });

      for (const vote of votes) {
        const arbiter = vote.arbiter;
        const votedCorrectly =
          (outcome === DisputeOutcome.FAVOR_LANDLORD && vote.favorLandlord) ||
          (outcome === DisputeOutcome.FAVOR_TENANT && !vote.favorLandlord);

        arbiter.totalDisputesResolved += 1;

        if (votedCorrectly) {
          arbiter.successfulResolutions += 1;
          arbiter.reputationScore = Number(arbiter.reputationScore) + 10;
        } else {
          arbiter.reputationScore = Math.max(
            0,
            Number(arbiter.reputationScore) - 5,
          );
        }

        await this.arbiterRepository.save(arbiter);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update arbiter reputation: ${error.message}`,
        error.stack,
      );
    }
  }
}
