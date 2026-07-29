import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '../entities/dispute.entity';
import { Type } from 'class-transformer';

export class UpdateDisputeDto {
  @ApiPropertyOptional({ example: 'UNDER_REVIEW', enum: DisputeStatus, description: 'New status for the dispute' })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ example: 'We have reviewed the lease agreement and found the tenant is entitled to a partial refund.', description: 'Updated description of the dispute', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 750.0, description: 'Updated disputed amount', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  requestedAmount?: number;
}
