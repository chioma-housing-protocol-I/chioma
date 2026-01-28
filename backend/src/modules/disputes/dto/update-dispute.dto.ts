import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { DisputeStatus } from '../entities/dispute.entity';
import { Type } from 'class-transformer';

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedAmount?: number;
}
