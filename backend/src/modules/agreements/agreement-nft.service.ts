import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RentObligationNftService } from '../stellar/services/rent-obligation-nft.service';
import { RentObligationNft } from './entities/rent-obligation-nft.entity';

@Injectable()
export class AgreementNftService {
  private readonly logger = new Logger(AgreementNftService.name);

  constructor(
    @InjectRepository(RentObligationNft)
    private readonly nftRepository: Repository<RentObligationNft>,
    private readonly nftContractService: RentObligationNftService,
  ) {}

  async mintNftForAgreement(
    agreementId: string,
    landlordAddress: string,
  ): Promise<RentObligationNft> {
    const existing = await this.nftRepository.findOne({
      where: { agreementId },
    });

    if (existing) {
      throw new Error(`NFT already minted for agreement ${agreementId}`);
    }

    const { txHash, obligationId } =
      await this.nftContractService.mintObligation({
        agreementId,
        landlordAddress,
      });

    const nft = this.nftRepository.create({
      agreementId,
      obligationId,
      currentOwner: landlordAddress,
      originalLandlord: landlordAddress,
      mintTxHash: txHash,
      mintedAt: new Date(),
      status: 'active',
    });

    await this.nftRepository.save(nft);

    this.logger.log(`NFT minted for agreement ${agreementId}: ${txHash}`);

    return nft;
  }

  async transferNft(
    agreementId: string,
    fromAddress: string,
    toAddress: string,
  ): Promise<RentObligationNft> {
    const nft = await this.nftRepository.findOne({ where: { agreementId } });

    if (!nft) {
      throw new Error(`NFT not found for agreement ${agreementId}`);
    }

    if (nft.currentOwner !== fromAddress) {
      throw new Error('Unauthorized: Not the current NFT owner');
    }

    const { txHash } = await this.nftContractService.transferObligation({
      agreementId,
      fromAddress,
      toAddress,
    });

    nft.currentOwner = toAddress;
    nft.lastTransferTxHash = txHash;
    nft.lastTransferredAt = new Date();
    nft.transferCount += 1;

    await this.nftRepository.save(nft);

    this.logger.log(
      `NFT transferred for agreement ${agreementId}: ${fromAddress} -> ${toAddress}`,
    );

    return nft;
  }

  async syncNftOwnership(agreementId: string): Promise<void> {
    const nft = await this.nftRepository.findOne({ where: { agreementId } });

    if (!nft) {
      return;
    }

    const onChainOwner =
      await this.nftContractService.getObligationOwner(agreementId);

    if (onChainOwner && onChainOwner !== nft.currentOwner) {
      this.logger.warn(
        `Ownership mismatch for ${agreementId}. Syncing: ${nft.currentOwner} -> ${onChainOwner}`,
      );
      nft.currentOwner = onChainOwner;
      await this.nftRepository.save(nft);
    }
  }

  async getNftByAgreement(
    agreementId: string,
  ): Promise<RentObligationNft | null> {
    return this.nftRepository.findOne({ where: { agreementId } });
  }

  async getNftsByOwner(ownerAddress: string): Promise<RentObligationNft[]> {
    return this.nftRepository.find({ where: { currentOwner: ownerAddress } });
  }

  async verifyOwnership(
    agreementId: string,
    address: string,
  ): Promise<boolean> {
    const nft = await this.nftRepository.findOne({ where: { agreementId } });
    return nft?.currentOwner === address;
  }
}
