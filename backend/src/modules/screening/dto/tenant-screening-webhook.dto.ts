import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import {
  UserScreeningRiskLevel,
  UserScreeningStatus,
} from '../screening.enums';

export class TenantScreeningWebhookDto {
  @ApiProperty({ example: 'provider_ref_abc123', description: 'Reference ID from the screening provider' })
  @IsString()
  providerReference: string;

  @ApiProperty({ example: 'COMPLETED', enum: UserScreeningStatus, description: 'Updated screening status' })
  @IsEnum(UserScreeningStatus)
  status: UserScreeningStatus;

  @ApiPropertyOptional({ example: 'report_xyz789', description: 'Provider report ID for fetching the full report' })
  @IsOptional()
  @IsString()
  providerReportId?: string;

  @ApiPropertyOptional({ example: 'LOW', enum: UserScreeningRiskLevel, description: 'Calculated risk level from the screening' })
  @IsOptional()
  @IsEnum(UserScreeningRiskLevel)
  riskLevel?: UserScreeningRiskLevel;

  @ApiPropertyOptional({ example: 'Insufficient documentation provided', description: 'Reason for failure if screening was not completed' })
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ example: { summary: 'Clean record', score: 85 }, description: 'Full report object from the screening provider' })
  @IsOptional()
  @IsObject()
  report?: Record<string, unknown>;
}
