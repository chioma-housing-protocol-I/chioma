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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('agreements/nfts')
@ApiTags('Agreement Nft')
export class AgreementNftController {
  constructor(
    private readonly nftService: AgreementNftService,
    private readonly analyticsService: NftAnalyticsService,
  ) {}

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Mint nft' })
  @Post('mint')
  @HttpCode(HttpStatus.CREATED)
  async mintNft(@Body() dto: MintNftDto) {
    return this.nftService.mintNftForAgreement(
      dto.agreementId,
      dto.adminAddress,
    );
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Transfer nft' })
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transferNft(@Body() dto: TransferNftDto) {
    return this.nftService.transferNft(
      dto.agreementId,
      dto.fromAddress,
      dto.toAddress,
    );
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get nft by agreement' })
  @Get('agreement/:agreementId')
  async getNftByAgreement(@Param('agreementId') agreementId: string) {
    return this.nftService.getNftByAgreement(agreementId);
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get nfts by owner' })
  @Get('owner/:ownerAddress')
  async getNftsByOwner(@Param('ownerAddress') ownerAddress: string) {
    return this.nftService.getNftsByOwner(ownerAddress);
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get analytics' })
  @Get('analytics')
  async getAnalytics() {
    return this.analyticsService.getAnalytics();
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get owner portfolio' })
  @Get('analytics/owner/:ownerAddress')
  async getOwnerPortfolio(@Param('ownerAddress') ownerAddress: string) {
    return this.analyticsService.getOwnerPortfolio(ownerAddress);
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Sync ownership' })
  @Post('sync/:agreementId')
  @HttpCode(HttpStatus.OK)
  async syncOwnership(@Param('agreementId') agreementId: string) {
    await this.nftService.syncNftOwnership(agreementId);
    return { message: 'Ownership synced successfully' };
  }
}
