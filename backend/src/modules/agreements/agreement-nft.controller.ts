import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgreementNftService } from './agreement-nft.service';
import { NftAnalyticsService } from './nft-analytics.service';
import { MintNftDto, TransferNftDto } from './dto/nft.dto';

@Controller('agreements/nfts')
export class AgreementNftController {
  constructor(
    private readonly nftService: AgreementNftService,
    private readonly analyticsService: NftAnalyticsService,
  ) {}

  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  async mintNft(@Body() dto: MintNftDto) {
    return this.nftService.mintNftForAgreement(
      dto.agreementId,
      dto.landlordAddress,
    );
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transferNft(@Body() dto: TransferNftDto) {
    return this.nftService.transferNft(
      dto.agreementId,
      dto.fromAddress,
      dto.toAddress,
    );
  }

  @Get('agreement/:agreementId')
  async getNftByAgreement(@Param('agreementId') agreementId: string) {
    return this.nftService.getNftByAgreement(agreementId);
  }

  @Get('owner/:ownerAddress')
  async getNftsByOwner(@Param('ownerAddress') ownerAddress: string) {
    return this.nftService.getNftsByOwner(ownerAddress);
  }

  @Get('analytics')
  async getAnalytics() {
    return this.analyticsService.getAnalytics();
  }

  @Get('analytics/owner/:ownerAddress')
  async getOwnerPortfolio(@Param('ownerAddress') ownerAddress: string) {
    return this.analyticsService.getOwnerPortfolio(ownerAddress);
  }

  @Post('sync/:agreementId')
  @HttpCode(HttpStatus.OK)
  async syncOwnership(@Param('agreementId') agreementId: string) {
    await this.nftService.syncNftOwnership(agreementId);
    return { message: 'Ownership synced successfully' };
  }
}
