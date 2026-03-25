import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import { Arbiter } from './entities/arbiter.entity';
import { DisputeVote } from './entities/dispute-vote.entity';
import {
  DisputeContractService,
  DisputeOutcome,
} from '../stellar/services/dispute-contract.service';
import * as crypto from 'crypto';

@Injectable()
export class DisputeBlockchainService {
  private readonly logger = new Logger(DisputeBlockchainService.name);

  constructor(
    @InjectRepository(Dispute)
    private disputeRepository: Repository<Dispute>,
    @InjectRepository(Arbiter)
    private arbiterRepository: Repository<Arbiter>,
    @InjectRepository(DisputeVote)
    private voteRepository: Repository<DisputeVote>,
    private disputeContractService: DisputeContractService,
  ) {}

  async addArbiter(stellarAddress: string, userId?: number): Promise<Arbiter> {
    const existing = await this.arbiterRepository.findOne({
      where: { stellarAddress },
    });

    if (existing) {
      throw new Error('Arbiter already exists');
    }

    const txHash = await this.disputeContractService.addArbiter(stellarAddress);

    const arbiter = this.arbiterRepository.create({
      stellarAddress,
      userId,
      active: true,
      transactionHash: txHash,
      blockchainAddedAt: Date.now(),
    });

    await this.arbiterRepository.save(arbiter);
    this.logger.log(`Arbiter added: ${stellarAddress}`);

    return arbiter;
  }

  async raiseDisputeOnChain(
    dispute: Dispute,
    raiserAddress: string,
  ): Promise<void> {
    const detailsHash = this.generateDetailsHash(dispute);
    const agreementId =
      dispute.agreement?.blockchainAgreementId ||
      dispute.agreementId.toString();

    try {
      const txHash = await this.disputeContractService.raiseDispute(
        raiserAddress,
        agreementId,
        detailsHash,
      );

      dispute.blockchainAgreementId = agreementId;
      dispute.detailsHash = detailsHash;
      dispute.transactionHash = txHash;
      dispute.blockchainRaisedAt = Date.now();
      dispute.blockchainSyncedAt = new Date();

      await this.disputeRepository.save(dispute);
      this.logger.log(`Dispute raised on-chain: ${dispute.disputeId}`);
    } catch (error) {
      this.logger.error(`Failed to raise dispute on-chain: ${error.message}`);
      throw error;
    }
  }

  async submitVote(
    disputeId: number,
    arbiterId: number,
    favorLandlord: boolean,
    arbiterAddress: string,
  ): Promise<DisputeVote> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['agreement'],
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new Error('Dispute already resolved');
    }

    const existingVote = await this.voteRepository.findOne({
      where: { disputeId, arbiterId },
    });

    if (existingVote) {
      throw new Error('Arbiter already voted');
    }

    const agreementId =
      dispute.blockchainAgreementId || dispute.agreementId.toString();

    try {
      const txHash = await this.disputeContractService.voteOnDispute(
        arbiterAddress,
        agreementId,
        favorLandlord,
      );

      const vote = this.voteRepository.create({
        disputeId,
        arbiterId,
        favorLandlord,
        transactionHash: txHash,
        blockchainVotedAt: Date.now(),
      });

      await this.voteRepository.save(vote);

      // Update vote counts
      if (favorLandlord) {
        dispute.votesFavorLandlord += 1;
      } else {
        dispute.votesFavorTenant += 1;
      }
      await this.disputeRepository.save(dispute);

      // Update arbiter stats
      await this.arbiterRepository.increment(
        { id: arbiterId },
        'totalVotes',
        1,
      );

      this.logger.log(`Vote submitted for dispute ${dispute.disputeId}`);
      return vote;
    } catch (error) {
      this.logger.error(`Failed to submit vote: ${error.message}`);
      throw error;
    }
  }

  async resolveDispute(disputeId: number): Promise<void> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['agreement'],
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new Error('Dispute already resolved');
    }

    const agreementId =
      dispute.blockchainAgreementId || dispute.agreementId.toString();

    try {
      const { outcome, txHash } =
        await this.disputeContractService.resolveDispute(agreementId);

      dispute.status = DisputeStatus.RESOLVED;
      dispute.blockchainOutcome =
        outcome === DisputeOutcome.FAVOR_LANDLORD
          ? 'FavorLandlord'
          : 'FavorTenant';
      dispute.blockchainResolvedAt = Date.now();
      dispute.resolvedAt = new Date();
      dispute.transactionHash = txHash;
      dispute.blockchainSyncedAt = new Date();

      await this.disputeRepository.save(dispute);

      // Update arbiter stats
      const votes = await this.voteRepository.find({ where: { disputeId } });
      for (const vote of votes) {
        await this.arbiterRepository.increment(
          { id: vote.arbiterId },
          'totalDisputesResolved',
          1,
        );
      }

      this.logger.log(`Dispute resolved: ${dispute.disputeId} - ${outcome}`);
    } catch (error) {
      this.logger.error(`Failed to resolve dispute: ${error.message}`);
      throw error;
    }
  }

  async syncDisputeFromChain(disputeId: number): Promise<void> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute || !dispute.blockchainAgreementId) {
      throw new Error('Dispute not found or not on-chain');
    }

    const chainDispute = await this.disputeContractService.getDispute(
      dispute.blockchainAgreementId,
    );

    if (!chainDispute) {
      throw new Error('Dispute not found on-chain');
    }

    dispute.votesFavorLandlord = chainDispute.votesFavorLandlord;
    dispute.votesFavorTenant = chainDispute.votesFavorTenant;
    dispute.blockchainResolvedAt = chainDispute.resolvedAt || undefined;
    dispute.blockchainSyncedAt = new Date();

    if (
      chainDispute.resolved &&
      chainDispute.outcome &&
      chainDispute.resolvedAt
    ) {
      dispute.status = DisputeStatus.RESOLVED;
      dispute.blockchainOutcome =
        chainDispute.outcome === DisputeOutcome.FAVOR_LANDLORD
          ? 'FavorLandlord'
          : 'FavorTenant';
      dispute.resolvedAt = new Date(chainDispute.resolvedAt * 1000);
    }

    await this.disputeRepository.save(dispute);
    this.logger.log(`Dispute synced from chain: ${dispute.disputeId}`);
  }

  async getActiveArbiters(): Promise<Arbiter[]> {
    return this.arbiterRepository.find({
      where: { active: true },
      order: { totalVotes: 'DESC' },
    });
  }

  async getArbiterStats(arbiterId: number): Promise<any> {
    const arbiter = await this.arbiterRepository.findOne({
      where: { id: arbiterId },
    });

    if (!arbiter) {
      throw new Error('Arbiter not found');
    }

    const votes = await this.voteRepository.find({
      where: { arbiterId },
    });

    return {
      arbiter,
      totalVotes: arbiter.totalVotes,
      totalDisputesResolved: arbiter.totalDisputesResolved,
      recentVotes: votes.slice(0, 10),
    };
  }

  private generateDetailsHash(dispute: Dispute): string {
    const data = JSON.stringify({
      disputeId: dispute.disputeId,
      type: dispute.disputeType,
      description: dispute.description,
      requestedAmount: dispute.requestedAmount,
      timestamp: Date.now(),
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
