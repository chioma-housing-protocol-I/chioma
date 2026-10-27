import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateConsentDto {
  @ApiPropertyOptional({ description: 'Allow optional cookies' })
  @IsOptional()
  @IsBoolean()
  cookieConsent?: boolean;

  @ApiPropertyOptional({ description: 'Allow email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Allow SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Opt in to marketing communications' })
  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  @ApiPropertyOptional({ description: 'Accept the data processing agreement' })
  @IsOptional()
  @IsBoolean()
  dataProcessingAgreementAccepted?: boolean;

  @ApiPropertyOptional({
    description: 'Version of the data processing agreement being accepted',
    example: '2026-10-v1',
    maxLength: 64,
  })
  @ValidateIf(
    (consent: UpdateConsentDto) =>
      consent.dataProcessingAgreementAccepted === true ||
      consent.dataProcessingAgreementVersion !== undefined,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  dataProcessingAgreementVersion?: string;
}