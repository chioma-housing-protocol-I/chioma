import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import {
  TenantScreeningRiskLevel,
  TenantScreeningStatus,
} from '../screening.enums';

export class TenantScreeningWebhookDto {
  @ApiProperty()
  @IsString()
  providerReference: string;

  @ApiProperty({ enum: TenantScreeningStatus })
  @IsEnum(TenantScreeningStatus)
  status: TenantScreeningStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerReportId?: string;

  @ApiPropertyOptional({ enum: TenantScreeningRiskLevel })
  @IsOptional()
  @IsEnum(TenantScreeningRiskLevel)
  riskLevel?: TenantScreeningRiskLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  report?: Record<string, unknown>;
}
