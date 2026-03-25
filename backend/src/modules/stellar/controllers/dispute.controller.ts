import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DisputeContractEnhancedService } from '../services/dispute-contract-enhanced.service';
import { DisputeContractService } from '../services/dispute-contract.service';
import {
  RegisterArbiterDto,
  DeregisterArbiterDto,
  SelectArbitersDto,
  TrackVoteDto,
  CastVoteDto,
  EnforceResolutionDto,
  ResolveDisputeDto,
  UpdateReputationDto,
  ArbiterInfoDto,
  VoteResultsDto,
  DisputeTimelineDto,
  ReputationScoreDto,
  DisputeEnforcementResultDto,
} from '../dto/dispute-enhanced.dto';

@ApiTags('Dispute Resolution')
@Controller('stellar/disputes')
export class DisputeController {
  constructor(
    private readonly disputeEnhancedService: DisputeContractEnhancedService,
    private readonly disputeContractService: DisputeContractService,
  ) {}

  // ==================== Arbiter Management ====================

  @Post('arbiters/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new arbiter' })
  @ApiResponse({
    status: 201,
    description: 'Arbiter registered successfully',
  })
  async registerArbiter(
    @Body() dto: RegisterArbiterDto,
  ): Promise<{ transactionHash: string; message: string }> {
    const txHash = await this.disputeEnhancedService.registerArbiter(
      dto.arbiterAddress,
      dto.qualifications,
      dto.stakeAmount,
      dto.specialization,
    );

    return {
      transactionHash: txHash,
      message: `Arbiter ${dto.arbiterAddress} registered successfully`,
    };
  }

  @Post('arbiters/deregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deregister an arbiter' })
  @ApiResponse({
    status: 200,
    description: 'Arbiter deregistered successfully',
  })
  async deregisterArbiter(
    @Body() dto: DeregisterArbiterDto,
  ): Promise<{ message: string }> {
    const message = await this.disputeEnhancedService.deregisterArbiter(
      dto.arbiterAddress,
    );

    return { message };
  }

  @Get('arbiters/pool')
  @ApiOperation({ summary: 'Get all active arbiters' })
  @ApiResponse({
    status: 200,
    description: 'List of active arbiters',
    type: [ArbiterInfoDto],
  })
  async getArbiterPool(): Promise<ArbiterInfoDto[]> {
    return await this.disputeEnhancedService.getArbiterPool();
  }

  @Post('arbiters/select')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Select arbiters for a dispute' })
  @ApiResponse({
    status: 200,
    description: 'Arbiters selected successfully',
  })
  async selectArbiters(
    @Body() dto: SelectArbitersDto,
  ): Promise<{ arbiters: string[] }> {
    const arbiters = await this.disputeEnhancedService.selectArbitersForDispute(
      dto.disputeId,
      dto.count,
      dto.specialization,
    );

    return { arbiters };
  }

  @Get('arbiters/:address')
  @ApiOperation({ summary: 'Get arbiter information' })
  @ApiResponse({
    status: 200,
    description: 'Arbiter information',
  })
  async getArbiter(@Param('address') address: string): Promise<any> {
    const arbiterInfo = await this.disputeContractService.getArbiter(address);
    return arbiterInfo;
  }

  @Get('arbiters/:address/reputation')
  @ApiOperation({ summary: 'Get arbiter reputation score' })
  @ApiResponse({
    status: 200,
    description: 'Arbiter reputation details',
    type: ReputationScoreDto,
  })
  async getArbiterReputation(
    @Param('address') address: string,
  ): Promise<ReputationScoreDto> {
    return await this.disputeEnhancedService.calculateArbiterReputation(
      address,
    );
  }

  // ==================== Vote Management ====================

  @Post('votes/track')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Track a vote on a dispute' })
  @ApiResponse({
    status: 201,
    description: 'Vote tracked successfully',
  })
  async trackVote(@Body() dto: TrackVoteDto): Promise<{ message: string }> {
    const message = await this.disputeEnhancedService.trackVote(
      dto.disputeId,
      dto.arbiterAddress,
      dto.vote,
      dto.evidence,
      dto.reasoning,
    );

    return { message };
  }

  @Post('votes/cast')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cast a vote on blockchain' })
  @ApiResponse({
    status: 201,
    description: 'Vote cast successfully',
  })
  async castVote(
    @Body() dto: CastVoteDto,
  ): Promise<{ transactionHash: string; message: string }> {
    const txHash = await this.disputeContractService.voteOnDispute(
      dto.arbiterSecretKey,
      dto.agreementId,
      dto.favorLandlord,
    );

    return {
      transactionHash: txHash,
      message: `Vote cast successfully for agreement ${dto.agreementId}`,
    };
  }

  @Get(':disputeId/votes')
  @ApiOperation({ summary: 'Get vote results for a dispute' })
  @ApiResponse({
    status: 200,
    description: 'Vote results',
    type: VoteResultsDto,
  })
  async getVoteResults(
    @Param('disputeId') disputeId: string,
  ): Promise<VoteResultsDto> {
    return await this.disputeEnhancedService.getVoteResults(disputeId);
  }

  // ==================== Dispute Resolution ====================

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a dispute on blockchain' })
  @ApiResponse({
    status: 200,
    description: 'Dispute resolved successfully',
  })
  async resolveDispute(
    @Body() dto: ResolveDisputeDto,
  ): Promise<{ outcome: string; transactionHash: string }> {
    const result = await this.disputeContractService.resolveDispute(
      dto.agreementId,
    );

    return {
      outcome: result.outcome,
      transactionHash: result.txHash,
    };
  }

  @Post('enforce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enforce dispute resolution' })
  @ApiResponse({
    status: 200,
    description: 'Resolution enforced successfully',
    type: DisputeEnforcementResultDto,
  })
  async enforceResolution(
    @Body() dto: EnforceResolutionDto,
  ): Promise<DisputeEnforcementResultDto> {
    return await this.disputeEnhancedService.enforceDisputeResolution(
      dto.disputeId,
      dto.outcome,
      dto.enforcementAction,
    );
  }

  @Get(':disputeId')
  @ApiOperation({ summary: 'Get dispute information' })
  @ApiResponse({
    status: 200,
    description: 'Dispute information',
  })
  async getDispute(@Param('disputeId') disputeId: string): Promise<any> {
    const dispute = await this.disputeContractService.getDispute(disputeId);
    return dispute;
  }

  @Get(':disputeId/timeline')
  @ApiOperation({ summary: 'Get dispute event timeline' })
  @ApiResponse({
    status: 200,
    description: 'Dispute timeline',
    type: DisputeTimelineDto,
  })
  async getDisputeTimeline(
    @Param('disputeId') disputeId: string,
  ): Promise<DisputeTimelineDto> {
    return await this.disputeEnhancedService.getDisputeTimeline(disputeId);
  }
}
