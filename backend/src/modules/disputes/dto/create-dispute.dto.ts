import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeType } from '../entities/dispute.entity';

export class CreateDisputeDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID of the rent agreement this dispute relates to' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  agreementId: string;

  @ApiProperty({ example: 'RENT_PAYMENT', enum: DisputeType, description: 'Type of dispute' })
  @IsNotEmpty()
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @ApiPropertyOptional({ example: 1500.0, description: 'Amount in dispute (if applicable)', minimum: 0, maximum: 999999999.99 })
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  @IsOptional()
  requestedAmount?: number;

  @ApiProperty({ example: 'The landlord has not returned the security deposit after lease termination. Multiple attempts to contact have failed.', description: 'Detailed description of the dispute', minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ example: ['https://storage.example.com/evidence/photo1.jpg', 'https://storage.example.com/evidence/receipt.pdf'], description: 'URLs of supporting evidence documents' })
  @IsArray()
  @IsOptional()
  evidenceUrls?: string[];

  @ApiPropertyOptional({ example: '{"unit": "3B", "building": "Sunset Apartments"}', description: 'Arbitrary metadata as JSON string', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metadata?: string;

  @ApiPropertyOptional({ example: 'idemp_01HN7K...', description: 'Idempotency key to prevent duplicate submissions', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
