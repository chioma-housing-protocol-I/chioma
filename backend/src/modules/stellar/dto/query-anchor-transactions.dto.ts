import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  AnchorTransactionStatus,
  AnchorTransactionType,
} from '../../transactions/entities/anchor-transaction.entity';

export class QueryAnchorTransactionsDto {
  @ApiPropertyOptional({
    enum: AnchorTransactionType,
    description: 'Filter by anchor transaction type',
  })
  @IsOptional()
  @IsEnum(AnchorTransactionType)
  type?: AnchorTransactionType;

  @ApiPropertyOptional({
    enum: AnchorTransactionStatus,
    description: 'Filter by anchor transaction status',
  })
  @IsOptional()
  @IsEnum(AnchorTransactionStatus)
  status?: AnchorTransactionStatus;

  @ApiPropertyOptional({
    description:
      'Free-text search across wallet, anchor transaction ID, Stellar transaction ID, currency, destination, and memo',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Inclusive transaction creation start date',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive transaction creation end date',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
