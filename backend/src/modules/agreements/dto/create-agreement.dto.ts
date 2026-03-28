import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgreementDto {
  @ApiProperty({
    description: 'Property ID for the rental agreement',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  propertyId: string;

  @ApiProperty({
    description: 'Landlord user ID',
    example: 'landlord-uuid-string',
  })
  @IsNotEmpty()
  @IsString()
  landlordId: string;

  @ApiProperty({
    description: 'Tenant user ID',
    example: 'tenant-uuid-string',
  })
  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @ApiPropertyOptional({
    description: 'Agent user ID (optional)',
    example: 'agent-uuid-string',
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  // Stellar Public Keys (56 characters for Stellar addresses)
  @ApiProperty({
    description: 'Landlord Stellar public key for blockchain payments',
    example: 'GD5DJ3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
    minLength: 56,
    maxLength: 56,
    pattern: '^G[A-Z0-9]{55}$',
  })
  @IsNotEmpty()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Landlord Stellar public key must be a valid Stellar address starting with G',
  })
  landlordStellarPubKey: string;

  @ApiProperty({
    description: 'Tenant Stellar public key for blockchain payments',
    example: 'GD7J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
    minLength: 56,
    maxLength: 56,
    pattern: '^G[A-Z0-9]{55}$',
  })
  @IsNotEmpty()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Tenant Stellar public key must be a valid Stellar address starting with G',
  })
  tenantStellarPubKey: string;

  @ApiPropertyOptional({
    description: 'Agent Stellar public key for commission payments',
    example: 'GD8J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
    minLength: 56,
    maxLength: 56,
    pattern: '^G[A-Z0-9]{55}$',
  })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Agent Stellar public key must be a valid Stellar address starting with G',
  })
  agentStellarPubKey?: string;

  @ApiPropertyOptional({
    description: 'Escrow account public key for security deposits',
    example: 'GD9J3B6A2KHWGFPJGBM4D7J23G5QJY6XQFQKXQ2Q2Q2Q2Q2Q2Q2Q',
    minLength: 56,
    maxLength: 56,
    pattern: '^G[A-Z0-9]{55}$',
  })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Escrow account public key must be a valid Stellar address starting with G',
  })
  escrowAccountPubKey?: string;

  // Financial Terms
  @ApiProperty({
    description: 'Monthly rent amount in USD',
    example: 1500.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @ApiProperty({
    description: 'Security deposit amount in USD',
    example: 3000.0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  securityDeposit: number;

  @ApiPropertyOptional({
    description: 'Agent commission rate as percentage (0-100)',
    example: 5.0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  agentCommissionRate?: number;

  // Lease Terms
  @ApiProperty({
    description: 'Lease start date (ISO 8601 format)',
    example: '2024-02-01',
    format: 'date',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Lease end date (ISO 8601 format)',
    example: '2025-01-31',
    format: 'date',
  })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  // Terms and Conditions
  @ApiPropertyOptional({
    description: 'Additional terms and conditions for the lease',
    example: 'No smoking policy. Pets allowed with additional deposit.',
  })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({
    description: 'Whether the lease may auto-renew or be extended under renewal terms',
  })
  @IsOptional()
  @IsBoolean()
  renewalOption?: boolean;

  @ApiPropertyOptional({
    description: 'Deadline to give renewal notice (ISO 8601 date)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  renewalNoticeDate?: string;

  @ApiPropertyOptional({
    description: 'Actual move-in date (ISO 8601 date)',
    example: '2024-02-05',
  })
  @IsOptional()
  @IsDateString()
  moveInDate?: string;

  @ApiPropertyOptional({
    description: 'Actual move-out date (ISO 8601 date)',
    example: '2025-01-28',
  })
  @IsOptional()
  @IsDateString()
  moveOutDate?: string;

  @ApiPropertyOptional({
    description: 'Whether rent includes utilities',
  })
  @IsOptional()
  @IsBoolean()
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({
    description: 'Who handles routine maintenance (e.g. landlord, tenant, split)',
    example: 'Landlord handles major; tenant handles minor',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  maintenanceResponsibility?: string;

  @ApiPropertyOptional({
    description: 'Flat early termination fee amount',
    example: 1500.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  earlyTerminationFee?: number;

  @ApiPropertyOptional({
    description: 'Late rent penalty as percentage of monthly rent (e.g. 5 = 5%)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeePercentage?: number;

  @ApiPropertyOptional({
    description: 'Days after due date before late fee applies',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  gracePeriodDays?: number;
}
