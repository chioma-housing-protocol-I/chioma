import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentObligationNft } from '../../agreements/entities/rent-obligation-nft.entity';
import { safeEventListener } from '../../../common/utils/safe-event-listener';

export interface ObligationMintedEvent {
  agreementId: string;
  admin: string;
  mintedAt: number;
  txHash: string;
}

export interface ObligationTransferredEvent {
  agreementId: string;
  from: string;
  to: string;
  txHash: string;
}

@Injectable()
export class NftEventProcessor {
  private readonly logger = new Logger(NftEventProcessor.name);

  constructor(
    @InjectRepository(RentObligationNft)
    private readonly nftRepository: Repository<RentObligationNft>,
  ) {}

  @OnEvent('obligation.minted')
  handleObligationMinted(event: ObligationMintedEvent): Promise<void> {
    return safeEventListener(
      'obligation.minted',
      async (minted: ObligationMintedEvent) => {
        this.logger.log(
          `Processing obligation minted event for agreement ${minted.agreementId}`,
        );

        const existing = await this.nftRepository.findOne({
          where: { agreementId: minted.agreementId },
        });

        if (existing) {
          this.logger.warn(
            `NFT already exists for agreement ${minted.agreementId}, skipping`,
          );
          return;
        }

        const nft = this.nftRepository.create({
          agreementId: minted.agreementId,
          obligationId: minted.agreementId,
          currentOwner: minted.admin,
          originalLandlord: minted.admin,
          mintTxHash: minted.txHash,
          mintedAt: new Date(minted.mintedAt * 1000),
          status: 'active',
          transferCount: 0,
        });

        await this.nftRepository.save(nft);
        this.logger.log(
          `NFT record created for agreement ${minted.agreementId}`,
        );
      },
      this.logger,
    )(event);
  }

  @OnEvent('obligation.transferred')
  handleObligationTransferred(
    event: ObligationTransferredEvent,
  ): Promise<void> {
    return safeEventListener(
      'obligation.transferred',
      async (transferred: ObligationTransferredEvent) => {
        this.logger.log(
          `Processing obligation transfer event for agreement ${transferred.agreementId}`,
        );

        const nft = await this.nftRepository.findOne({
          where: { agreementId: transferred.agreementId },
        });

        if (!nft) {
          this.logger.error(
            `NFT not found for agreement ${transferred.agreementId}, cannot process transfer`,
          );
          return;
        }

        nft.currentOwner = transferred.to;
        nft.lastTransferTxHash = transferred.txHash;
        nft.lastTransferredAt = new Date();
        nft.transferCount += 1;

        await this.nftRepository.save(nft);
        this.logger.log(
          `NFT ownership updated for agreement ${transferred.agreementId}: ${transferred.from} -> ${transferred.to}`,
        );
      },
      this.logger,
    )(event);
  }
}
