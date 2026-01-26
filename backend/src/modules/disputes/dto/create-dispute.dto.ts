import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { DisputeType } from '../entities/dispute.entity';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsString()
  agreementId: string;

  @IsNotEmpty()
  @IsEnum(DisputeType)
  disputeType: DisputeType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  requestedAmount?: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsOptional()
  evidenceUrls?: string[];
}
