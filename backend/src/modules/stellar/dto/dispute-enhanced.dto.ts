import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DisputeOutcome {
  FAVOR_LANDLORD = 'FavorLandlord',
  FAVOR_TENANT = 'FavorTenant',
}

// ==================== Arbiter Management DTOs ====================

export class RegisterArbiterDto {
  @ApiProperty({ description: 'Stellar address of the arbiter' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format',
  })
  arbiterAddress: string;

  @ApiProperty({ description: 'Qualifications of the arbiter' })
  @IsString()
  @IsNotEmpty()
  qualifications: string;

  @ApiProperty({ description: 'Stake amount in stroops' })
  @IsString()
  @IsNotEmpty()
  stakeAmount: string;

  @ApiPropertyOptional({ description: 'Specialization area' })
  @IsOptional()
  @IsString()
  specialization?: string;
}

export class DeregisterArbiterDto {
  @ApiProperty({ description: 'Stellar address of the arbiter to deregister' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format',
  })
  arbiterAddress: string;
}

export class SelectArbitersDto {
  @ApiProperty({ description: 'Dispute ID' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ description: 'Number of arbiters to select' })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiPropertyOptional({ description: 'Required specialization' })
  @IsOptional()
  @IsString()
  specialization?: string;
}

// ==================== Vote Tracking DTOs ====================

export class TrackVoteDto {
  @ApiProperty({ description: 'Dispute ID' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ description: 'Arbiter Stellar address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format',
  })
  arbiterAddress: string;

  @ApiProperty({ description: 'Vote: true for landlord, false for tenant' })
  @IsBoolean()
  vote: boolean;

  @ApiPropertyOptional({ description: 'Evidence supporting the vote' })
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiPropertyOptional({ description: 'Reasoning for the vote' })
  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class CastVoteDto {
  @ApiProperty({ description: 'Agreement ID' })
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @ApiProperty({ description: 'Arbiter secret key for signing' })
  @IsString()
  @IsNotEmpty()
  arbiterSecretKey: string;

  @ApiProperty({ description: 'Vote in favor of landlord' })
  @IsBoolean()
  favorLandlord: boolean;

  @ApiPropertyOptional({ description: 'Comment on the vote' })
  @IsOptional()
  @IsString()
  comment?: string;
}

// ==================== Resolution Enforcement DTOs ====================

export class EnforceResolutionDto {
  @ApiProperty({ description: 'Dispute ID' })
  @IsString()
  @IsNotEmpty()
  disputeId: string;

  @ApiProperty({ description: 'Dispute outcome', enum: DisputeOutcome })
  @IsEnum(DisputeOutcome)
  outcome: DisputeOutcome;

  @ApiPropertyOptional({ description: 'Enforcement action details' })
  @IsOptional()
  @IsString()
  enforcementAction?: string;
}

export class ResolveStellarDisputeDto {
  @ApiProperty({ description: 'Agreement ID' })
  @IsString()
  @IsNotEmpty()
  agreementId: string;
}

// ==================== Reputation DTOs ====================

export class UpdateReputationDto {
  @ApiProperty({ description: 'Arbiter Stellar address' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format',
  })
  arbiterAddress: string;

  @ApiProperty({ description: 'Reputation score' })
  @IsNumber()
  @Min(0)
  reputationScore: number;
}

// ==================== Response DTOs ====================

export class ArbiterInfoDto {
  address: string;
  active: boolean;
  addedAt: number;
  totalVotes: number;
  totalDisputesResolved: number;
  reputationScore: number;
  successfulResolutions: number;
  qualifications?: string;
  specialization?: string;
  stakeAmount?: string;
}

export class VoteResultsDto {
  disputeId: string;
  votesFavorLandlord: number;
  votesFavorTenant: number;
  totalVotes: number;
  outcome?: DisputeOutcome;
  resolved: boolean;
  votes: {
    arbiterAddress: string;
    favorLandlord: boolean;
    votedAt: Date;
    voteWeight: number;
    comment?: string;
  }[];
}

export class DisputeTimelineDto {
  disputeId: string;
  events: {
    id: number;
    eventType: string;
    eventData: Record<string, any>;
    timestamp: Date;
    triggeredBy?: string;
    transactionHash?: string;
  }[];
}

export class ReputationScoreDto {
  arbiterAddress: string;
  reputationScore: number;
  totalVotes: number;
  totalDisputesResolved: number;
  successfulResolutions: number;
  successRate: number;
}

export class DisputeEnforcementResultDto {
  disputeId: string;
  outcome: DisputeOutcome;
  transactionHash: string;
  enforcedAt: Date;
  escrowReleased: boolean;
  recipientAddress?: string;
}
