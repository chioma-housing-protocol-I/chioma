import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Length,
  Matches,
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
}
