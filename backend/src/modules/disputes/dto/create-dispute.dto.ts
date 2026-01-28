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
import { DisputeType } from '../entities/dispute.entity';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  agreementId: string;

  @IsNotEmpty()
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  @IsOptional()
  requestedAmount?: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsOptional()
  evidenceUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  metadata?: string;
}
