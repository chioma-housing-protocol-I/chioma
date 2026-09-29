import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AgreementNftService } from './agreement-nft.service';
import { NftAnalyticsService } from './nft-analytics.service';
import {
  MintNftDto,
  TransferNftDto,
  BurnNftDto,
  AdminReassignObligationDto,
} from './dto/nft.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { RentObligationNft } from './entities/rent-obligation-nft.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

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
  @ApiPaginatedResponse(RentObligationNft)
  async getNftsByOwner(
    @Param('ownerAddress') ownerAddress: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.nftService.getNftsByOwner(
      ownerAddress,
      query.page,
      query.limit,
    );
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

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiResponse({ status: 200, description: 'Burned' })
  @ApiOperation({ summary: 'Burn nft (admin only)' })
  @Post('burn')
  @HttpCode(HttpStatus.OK)
  async burnNft(@Body() dto: BurnNftDto) {
    return this.nftService.burnNftForAgreement(dto.agreementId, dto.reason);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiResponse({ status: 200, description: 'Reassigned' })
  @ApiOperation({ summary: 'Admin reassign obligation (admin only)' })
  @Post('admin-reassign')
  @HttpCode(HttpStatus.OK)
  async adminReassign(@Body() dto: AdminReassignObligationDto) {
    return this.nftService.adminReassignNft(
      dto.agreementId,
      dto.newOwnerAddress,
      dto.adminAddress,
    );
  }
}
