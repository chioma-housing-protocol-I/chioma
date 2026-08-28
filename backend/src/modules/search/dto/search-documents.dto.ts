import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgreementStatus } from '../../rent/entities/rent-contract.entity';

/** Trims a string and strips ASCII / unicode control characters. */
function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\p{Cc}/gu, '');
}

/**
 * Fields SearchService.searchDocuments() is allowed to sort by. Kept in
 * sync with the `allowedSortFields` allowlist in search.service.ts.
 */
export const DOCUMENT_SEARCH_SORT_FIELDS = [
  'createdAt',
  'startDate',
  'endDate',
  'monthlyRent',
  'status',
] as const;

export class SearchDocumentsDto {
  @ApiPropertyOptional({
    description: 'Full-text search query',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by agreement status',
    enum: AgreementStatus,
  })
  @IsOptional()
  @IsEnum(AgreementStatus)
  status?: AgreementStatus;

  @ApiPropertyOptional({ description: 'Filter by property UUID' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant/user UUID' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by admin UUID' })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  adminId?: string;

  @ApiPropertyOptional({ description: 'Minimum monthly rent', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRent?: number;

  @ApiPropertyOptional({ description: 'Maximum monthly rent', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRent?: number;

  @ApiPropertyOptional({ description: 'Inclusive start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: DOCUMENT_SEARCH_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(DOCUMENT_SEARCH_SORT_FIELDS)
  sortBy?: (typeof DOCUMENT_SEARCH_SORT_FIELDS)[number];

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
