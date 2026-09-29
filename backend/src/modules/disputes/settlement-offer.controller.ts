import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettlementOfferService } from './settlement-offer.service';
import {
  CreateSettlementOfferDto,
  RespondSettlementOfferDto,
} from './dto/settlement-offer.dto';

@ApiTags('Disputes')
@ApiBearerAuth('JWT-auth')
@Controller('disputes/:disputeId/settlement-offers')
@UseGuards(JwtAuthGuard)
export class SettlementOfferController {
  constructor(private readonly settlementOffers: SettlementOfferService) {}

  @Get()
  @ApiOperation({ summary: 'List settlement offers for a dispute' })
  @ApiResponse({ status: 200, description: 'Settlement offer history' })
  list(@Param('disputeId') disputeId: string, @Request() req) {
    return this.settlementOffers.listOffers(disputeId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Propose a settlement to the other party' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  create(
    @Param('disputeId') disputeId: string,
    @Body() dto: CreateSettlementOfferDto,
    @Request() req,
  ) {
    return this.settlementOffers.createOffer(disputeId, dto, req.user.id);
  }

  @Post(':offerId/respond')
  @ApiOperation({
    summary: 'Accept, reject, or counter a pending settlement offer',
  })
  @ApiResponse({ status: 201, description: 'Offer updated' })
  respond(
    @Param('disputeId') disputeId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: RespondSettlementOfferDto,
    @Request() req,
  ) {
    return this.settlementOffers.respondToOffer(
      disputeId,
      offerId,
      dto,
      req.user.id,
    );
  }
}
