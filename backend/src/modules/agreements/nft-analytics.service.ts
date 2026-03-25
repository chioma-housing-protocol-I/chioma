import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentObligationNft } from '../agreements/entities/rent-obligation-nft.entity';

export interface NftAnalytics {
  totalMinted: number;
  totalTransfers: number;
  activeNfts: number;
  uniqueOwners: number;
  averageTransfersPerNft: number;
  topOwners: Array<{ owner: string; count: number }>;
  recentTransfers: Array<{
    agreementId: string;
    from: string;
    to: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class NftAnalyticsService {
  private readonly logger = new Logger(NftAnalyticsService.name);

  constructor(
    @InjectRepository(RentObligationNft)
    private readonly nftRepository: Repository<RentObligationNft>,
  ) {}

  async getAnalytics(): Promise<NftAnalytics> {
    const [nfts, totalMinted] = await this.nftRepository.findAndCount();

    const activeNfts = nfts.filter((nft) => nft.status === 'active').length;
    const totalTransfers = nfts.reduce(
      (sum, nft) => sum + nft.transferCount,
      0,
    );

    const ownerCounts = new Map<string, number>();
    nfts.forEach((nft) => {
      ownerCounts.set(
        nft.currentOwner,
        (ownerCounts.get(nft.currentOwner) || 0) + 1,
      );
    });

    const topOwners = Array.from(ownerCounts.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentTransfers = nfts
      .filter((nft) => nft.lastTransferredAt)
      .sort(
        (a, b) =>
          b.lastTransferredAt!.getTime() - a.lastTransferredAt!.getTime(),
      )
      .slice(0, 20)
      .map((nft) => ({
        agreementId: nft.agreementId,
        from: nft.originalLandlord,
        to: nft.currentOwner,
        timestamp: nft.lastTransferredAt!,
      }));

    return {
      totalMinted,
      totalTransfers,
      activeNfts,
      uniqueOwners: ownerCounts.size,
      averageTransfersPerNft:
        totalMinted > 0 ? totalTransfers / totalMinted : 0,
      topOwners,
      recentTransfers,
    };
  }

  async getOwnerPortfolio(ownerAddress: string) {
    const nfts = await this.nftRepository.find({
      where: { currentOwner: ownerAddress },
    });

    return {
      owner: ownerAddress,
      totalNfts: nfts.length,
      activeNfts: nfts.filter((nft) => nft.status === 'active').length,
      totalTransfersReceived: nfts.reduce(
        (sum, nft) => sum + nft.transferCount,
        0,
      ),
      nfts: nfts.map((nft) => ({
        agreementId: nft.agreementId,
        mintedAt: nft.mintedAt,
        transferCount: nft.transferCount,
        status: nft.status,
      })),
    };
  }
}
