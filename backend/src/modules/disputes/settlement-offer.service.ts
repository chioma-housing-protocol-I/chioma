import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Dispute, DisputeStatus } from './entities/dispute.entity';
import {
  SettlementOffer,
  SettlementOfferStatus,
} from './entities/settlement-offer.entity';
import {
  CreateSettlementOfferDto,
  RespondSettlementOfferDto,
} from './dto/settlement-offer.dto';
import { DisputesService } from './disputes.service';
import {
  AgreementStatus,
  RentAgreement,
} from '../rent/entities/rent-contract.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuthorizationError,
  BusinessRuleViolationError,
} from '../../common/errors/domain-errors';

/** Dispute states in which the parties may still negotiate directly. */
const NEGOTIABLE_STATUSES = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW];

@Injectable()
export class SettlementOfferService {
  constructor(
    @InjectRepository(SettlementOffer)
    private readonly offerRepository: Repository<SettlementOffer>,
    private readonly disputesService: DisputesService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async listOffers(disputeId: string, userId: string) {
    const dispute = await this.disputesService.findByDisputeId(disputeId);
    this.getCounterparty(dispute, userId);
    return this.offerRepository.find({
      where: { disputeId: dispute.id },
      order: { createdAt: 'DESC' },
    });
  }

  async createOffer(
    disputeId: string,
    dto: CreateSettlementOfferDto,
    userId: string,
  ): Promise<SettlementOffer> {
    const dispute = await this.disputesService.findByDisputeId(disputeId);
    this.assertNegotiable(dispute);
    const recipientId = this.getCounterparty(dispute, userId);

    const pending = await this.offerRepository.findOne({
      where: { disputeId: dispute.id, status: SettlementOfferStatus.PENDING },
    });
    if (pending) {
      throw new BusinessRuleViolationError(
        'A settlement offer is already pending on this dispute; respond to it instead',
      );
    }

    const offer = await this.offerRepository.save(
      this.offerRepository.create({
        disputeId: dispute.id,
        proposedBy: userId,
        recipientId,
        terms: dto.terms,
        amount: dto.amount ?? null,
      }),
    );

    await this.notify(
      recipientId,
      'Settlement offer received',
      `You received a settlement offer on dispute ${dispute.disputeId}.`,
      'DISPUTE_SETTLEMENT_OFFERED',
    );
    return offer;
  }

  async respondToOffer(
    disputeId: string,
    offerId: string,
    dto: RespondSettlementOfferDto,
    userId: string,
  ): Promise<SettlementOffer> {
    const dispute = await this.disputesService.findByDisputeId(disputeId);
    this.assertNegotiable(dispute);

    const offer = await this.offerRepository.findOne({
      where: { id: offerId, disputeId: dispute.id },
    });
    if (!offer) {
      throw new NotFoundException(`Settlement offer ${offerId} not found`);
    }
    if (offer.recipientId !== userId) {
      throw new AuthorizationError(
        'Only the recipient can respond to this settlement offer',
      );
    }
    if (offer.status !== SettlementOfferStatus.PENDING) {
      throw new BusinessRuleViolationError(
        `Settlement offer is already ${offer.status.toLowerCase()}`,
      );
    }

    offer.respondedAt = new Date();
    offer.responseNote = dto.note ?? null;

    if (dto.action === 'reject') {
      offer.status = SettlementOfferStatus.REJECTED;
      const saved = await this.offerRepository.save(offer);
      await this.notify(
        offer.proposedBy,
        'Settlement offer rejected',
        `Your settlement offer on dispute ${dispute.disputeId} was rejected. The dispute can still proceed to arbitration.`,
        'DISPUTE_SETTLEMENT_REJECTED',
      );
      return saved;
    }

    if (dto.action === 'counter') {
      offer.status = SettlementOfferStatus.COUNTERED;
      const counter = await this.dataSource.transaction(async (manager) => {
        await manager.save(offer);
        return manager.save(
          manager.create(SettlementOffer, {
            disputeId: dispute.id,
            proposedBy: userId,
            recipientId: offer.proposedBy,
            terms: dto.terms!,
            amount: dto.amount ?? null,
            parentOfferId: offer.id,
          }),
        );
      });
      await this.notify(
        offer.proposedBy,
        'Settlement counter-offer received',
        `Your settlement offer on dispute ${dispute.disputeId} received a counter-offer.`,
        'DISPUTE_SETTLEMENT_COUNTERED',
      );
      return counter;
    }

    // accept: record agreed terms and resolve the dispute
    offer.status = SettlementOfferStatus.ACCEPTED;
    const amountText =
      offer.amount != null ? ` (amount: ${Number(offer.amount)})` : '';
    await this.dataSource.transaction(async (manager) => {
      await manager.save(offer);
      await manager.update(Dispute, dispute.id, {
        status: DisputeStatus.RESOLVED,
        resolution: `Settled by agreement: ${offer.terms}${amountText}`,
        resolvedBy: userId,
        resolvedAt: new Date(),
        metadata: {
          ...(dispute.metadata ?? {}),
          settlementOfferId: offer.id,
          settlementAmount: offer.amount,
        },
      });
      if (dispute.agreement?.status === AgreementStatus.DISPUTED) {
        await manager.update(RentAgreement, dispute.agreement.id, {
          status: AgreementStatus.ACTIVE,
        });
      }
    });

    await Promise.all(
      [offer.proposedBy, userId].map((id) =>
        this.notify(
          id,
          'Settlement accepted',
          `Dispute ${dispute.disputeId} has been resolved by settlement.`,
          'DISPUTE_SETTLEMENT_ACCEPTED',
        ),
      ),
    );
    return offer;
  }

  private assertNegotiable(dispute: Dispute): void {
    if (!NEGOTIABLE_STATUSES.includes(dispute.status)) {
      throw new BusinessRuleViolationError(
        'Settlement offers are only allowed on open disputes',
      );
    }
  }

  /** Returns the other party's id; throws if the user is not a party. */
  private getCounterparty(dispute: Dispute, userId: string): string {
    const landlordId = dispute.agreement?.adminId;
    const tenantId = dispute.agreement?.userId;
    if (userId === landlordId && tenantId) return tenantId;
    if (userId === tenantId && landlordId) return landlordId;
    throw new AuthorizationError(
      'Only the dispute parties can negotiate a settlement',
    );
  }

  private async notify(
    userId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<void> {
    try {
      await this.notificationsService.notify(userId, title, message, type);
    } catch {
      // Notification failures must not roll back the settlement action.
    }
  }
}
