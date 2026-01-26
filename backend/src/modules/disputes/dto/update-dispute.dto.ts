import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { DisputeStatus, DisputeType } from '../entities/dispute.entity';

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(DisputeType)
  disputeType?: DisputeType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedAmount?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}
