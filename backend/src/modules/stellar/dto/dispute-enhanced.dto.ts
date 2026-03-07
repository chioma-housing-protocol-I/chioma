import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { DisputeOutcome } from '../entities/dispute-vote.entity';

export class RegisterArbiterDto {
  @IsString()
  arbiterAddress: string;

  @IsString()
  qualifications: string;

  @IsString()
  stakeAmount: string;

  @IsOptional()
  @IsString()
  specialization?: string;
}

export class TrackVoteDto {
  @IsString()
  disputeId: string;

  @IsString()
  arbiterAddress: string;

  @IsBoolean()
  vote: boolean;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  reasoning?: string;
}

export class EnforceResolutionDto {
  @IsString()
  disputeId: string;

  @IsEnum(DisputeOutcome)
  outcome: DisputeOutcome;

  @IsOptional()
  @IsString()
  enforcementAction?: string;
}

export class SelectArbitersDto {
  @IsString()
  disputeId: string;

  @IsNumber()
  count: number;
}

export class VoteResults {
  votesFavorLandlord: number;
  votesFavorTenant: number;
  totalVotes: number;
  outcome?: DisputeOutcome;
  isComplete: boolean;
}

export class ReputationScore {
  score: number;
  totalDisputes: number;
  successfulResolutions: number;
  successRate: number;
  isActive: boolean;
}

export class DisputeTimelineEvent {
  id: number;
  disputeId: string;
  eventType: string;
  eventData: string;
  timestamp: Date;
  triggeredBy?: string;
}

export class ArbiterInfo {
  address: string;
  qualifications: string;
  specialization?: string;
  stakeAmount: string;
  isActive: boolean;
  reputationScore: number;
  totalDisputes: number;
  successfulResolutions: number;
  registeredAt: Date;
  lastActiveAt: Date;
}
