import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class GrantTenantScreeningConsentDto {
  @ApiProperty({ example: 'v1.2', description: 'Version of the consent form the applicant agreed to' })
  @IsString()
  consentTextVersion: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'ISO 8601 date when the consent expires' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
