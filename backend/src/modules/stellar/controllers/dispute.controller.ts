import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisputeContractService } from '../services/dispute-contract.service';
import {
  RegisterArbiterDto,
  TrackVoteDto,
  EnforceResolutionDto,
  SelectArbitersDto,
} from '../dto/dispute-enhanced.dto';

@Controller('dispute')
export class DisputeController {
  constructor(private readonly disputeContractService: DisputeContractService) {}

  // ==================== Arbiter Management ====================

  @Post('arbiters/register')
  @HttpCode(HttpStatus.CREATED)
  async registerArbiter(@Body() registerArbiterDto: RegisterArbiterDto) {
    const { arbiterAddress, qualifications, stakeAmount } = registerArbiterDto;
    const txHash = await this.disputeContractService.registerArbiter(
      arbiterAddress,
      qualifications,
      stakeAmount,
    );
    return {
      success: true,
      transactionHash: txHash,
      message: 'Arbiter registered successfully',
    };
  }

  @Post('arbiters/:address/deregister')
  @HttpCode(HttpStatus.OK)
  async deregisterArbiter(@Param('address') address: string) {
    const result = await this.disputeContractService.deregisterArbiter(address);
    return {
      success: true,
      message: result,
    };
  }

  @Get('arbiters/pool')
  async getArbiterPool() {
    const arbiters = await this.disputeContractService.getArbiterPool();
    return {
      success: true,
      data: arbiters,
      count: arbiters.length,
    };
  }

  @Get('arbiters/:address/reputation')
  async getArbiterReputation(@Param('address') address: string) {
    const reputation = await this.disputeContractService.calculateArbiterReputation(address);
    return {
      success: true,
      data: reputation,
    };
  }

  // ==================== Dispute Management ====================

  @Post(':disputeId/select-arbiters')
  @HttpCode(HttpStatus.OK)
  async selectArbitersForDispute(
    @Param('disputeId') disputeId: string,
    @Body() selectArbitersDto: SelectArbitersDto,
  ) {
    const selectedArbiters = await this.disputeContractService.selectArbitersForDispute(
      disputeId,
      selectArbitersDto.count,
    );
    return {
      success: true,
      data: {
        disputeId,
        selectedArbiters,
        count: selectedArbiters.length,
      },
    };
  }

  @Post(':disputeId/vote')
  @HttpCode(HttpStatus.CREATED)
  async trackVote(
    @Param('disputeId') disputeId: string,
    @Body() trackVoteDto: TrackVoteDto,
  ) {
    const { arbiterAddress, vote, evidence } = trackVoteDto;
    const txHash = await this.disputeContractService.trackVote(
      disputeId,
      arbiterAddress,
      vote,
      evidence || '',
    );
    return {
      success: true,
      transactionHash: txHash,
      message: 'Vote recorded successfully',
    };
  }

  @Get(':disputeId/vote-results')
  async getVoteResults(@Param('disputeId') disputeId: string) {
    const results = await this.disputeContractService.getVoteResults(disputeId);
    return {
      success: true,
      data: results,
    };
  }

  @Post(':disputeId/enforce-resolution')
  @HttpCode(HttpStatus.OK)
  async enforceDisputeResolution(
    @Param('disputeId') disputeId: string,
    @Body() enforceResolutionDto: EnforceResolutionDto,
  ) {
    const { outcome } = enforceResolutionDto;
    const txHash = await this.disputeContractService.enforceDisputeResolution(
      disputeId,
      outcome,
    );
    return {
      success: true,
      transactionHash: txHash,
      message: 'Resolution enforced successfully',
    };
  }

  @Get(':disputeId/timeline')
  async getDisputeTimeline(@Param('disputeId') disputeId: string) {
    const timeline = await this.disputeContractService.getDisputeTimeline(disputeId);
    return {
      success: true,
      data: timeline,
      count: timeline.length,
    };
  }

  // ==================== Existing Contract Endpoints ====================

  @Post('raise')
  @HttpCode(HttpStatus.CREATED)
  async raiseDispute(
    @Body() raiseDisputeDto: {
      raiserAddress: string;
      agreementId: string;
      detailsHash: string;
    },
  ) {
    const { raiserAddress, agreementId, detailsHash } = raiseDisputeDto;
    const txHash = await this.disputeContractService.raiseDispute(
      raiserAddress,
      agreementId,
      detailsHash,
    );
    return {
      success: true,
      transactionHash: txHash,
      message: 'Dispute raised successfully',
    };
  }

  @Get(':agreementId')
  async getDispute(@Param('agreementId') agreementId: string) {
    const dispute = await this.disputeContractService.getDispute(agreementId);
    return {
      success: true,
      data: dispute,
    };
  }

  @Get('arbiters/:address')
  async getArbiter(@Param('address') address: string) {
    const arbiter = await this.disputeContractService.getArbiter(address);
    return {
      success: true,
      data: arbiter,
    };
  }

  @Get('arbiters/count')
  async getArbiterCount() {
    const count = await this.disputeContractService.getArbiterCount();
    return {
      success: true,
      data: { count },
    };
  }

  @Get(':disputeId/votes/:arbiterAddress')
  async getVote(
    @Param('disputeId') disputeId: string,
    @Param('arbiterAddress') arbiterAddress: string,
  ) {
    const vote = await this.disputeContractService.getVote(disputeId, arbiterAddress);
    return {
      success: true,
      data: vote,
    };
  }
}
