import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from './kyc.entity';

export class SubmitKycDto {
  @ApiProperty({
    description: 'KYC payload (SEP-9 style fields)',
    example: { first_name: 'John', last_name: 'Doe' },
  })
  @IsObject()
  @IsNotEmpty()
  kycData: Record<string, unknown>;
}

export class KycStatusResponseDto {
  @ApiProperty({ enum: KycStatus })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class KycWebhookDto {
  @ApiProperty({ description: 'Provider reference ID' })
  @IsString()
  providerReference: string;

  @ApiProperty({ enum: KycStatus })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
