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
import { ScreeningCheckType, UserScreeningProvider } from '../screening.enums';

export class CreateTenantScreeningRequestDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the tenant to be screened',
  })
  @IsUUID()
  tenantId: string;

  @ApiPropertyOptional({
    example: 'CHECKR',
    enum: UserScreeningProvider,
    description: 'Preferred screening provider',
  })
  @IsOptional()
  @IsEnum(UserScreeningProvider)
  provider?: UserScreeningProvider;

  @ApiProperty({
    example: ['IDENTITY', 'CRIMINAL', 'EVICTION'],
    enum: ScreeningCheckType,
    isArray: true,
    description: 'Types of screening checks to perform',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ScreeningCheckType, { each: true })
  requestedChecks: ScreeningCheckType[];

  @ApiProperty({
    example: {
      fullName: 'Jane Doe',
      dateOfBirth: '1990-01-15',
      ssnLast4: '1234',
    },
    description:
      'PII payload collected under consent for provider submission only.',
  })
  @IsObject()
  @IsNotEmpty()
  applicantData: Record<string, unknown>;

  @ApiProperty({
    example: 'v1.2',
    description: 'Version of the consent terms the applicant agreed to',
  })
  @IsString()
  @IsNotEmpty()
  consentVersion: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'UUID of the associated property (optional)',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({
    example: 'Urgent — applicant needs to move in by Aug 1',
    description: 'Additional notes for the screening request',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
