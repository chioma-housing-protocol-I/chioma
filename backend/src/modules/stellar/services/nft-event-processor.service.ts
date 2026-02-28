import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentObligationNft } from '../../agreements/entities/rent-obligation-nft.entity';

export interface ObligationMintedEvent {
  agreementId: string;
  landlord: string;
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
  async handleObligationMinted(event: ObligationMintedEvent) {
    this.logger.log(
      `Processing obligation minted event for agreement ${event.agreementId}`,
    );

    const existing = await this.nftRepository.findOne({
      where: { agreementId: event.agreementId },
    });

    if (existing) {
      this.logger.warn(
        `NFT already exists for agreement ${event.agreementId}, skipping`,
      );
      return;
    }

    const nft = this.nftRepository.create({
      agreementId: event.agreementId,
      obligationId: event.agreementId,
      currentOwner: event.landlord,
      originalLandlord: event.landlord,
      mintTxHash: event.txHash,
      mintedAt: new Date(event.mintedAt * 1000),
      status: 'active',
      transferCount: 0,
    });

    await this.nftRepository.save(nft);
    this.logger.log(`NFT record created for agreement ${event.agreementId}`);
  }

  @OnEvent('obligation.transferred')
  async handleObligationTransferred(event: ObligationTransferredEvent) {
    this.logger.log(
      `Processing obligation transfer event for agreement ${event.agreementId}`,
    );

    const nft = await this.nftRepository.findOne({
      where: { agreementId: event.agreementId },
    });

    if (!nft) {
      this.logger.error(
        `NFT not found for agreement ${event.agreementId}, cannot process transfer`,
      );
      return;
    }

    nft.currentOwner = event.to;
    nft.lastTransferTxHash = event.txHash;
    nft.lastTransferredAt = new Date();
    nft.transferCount += 1;

    await this.nftRepository.save(nft);
    this.logger.log(
      `NFT ownership updated for agreement ${event.agreementId}: ${event.from} -> ${event.to}`,
    );
  }
}
