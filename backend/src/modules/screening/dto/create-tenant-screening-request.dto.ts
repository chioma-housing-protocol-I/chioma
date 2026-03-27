import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ScreeningCheckType,
  TenantScreeningProvider,
} from '../screening.enums';

export class CreateTenantScreeningRequestDto {
  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({ enum: TenantScreeningProvider })
  @IsOptional()
  @IsEnum(TenantScreeningProvider)
  provider?: TenantScreeningProvider;

  @ApiProperty({ enum: ScreeningCheckType, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ScreeningCheckType, { each: true })
  requestedChecks: ScreeningCheckType[];

  @ApiProperty({
    description:
      'PII payload collected under consent for provider submission only.',
  })
  @IsObject()
  @IsNotEmpty()
  applicantData: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  consentVersion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
