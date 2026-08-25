import {
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

/** Trims a string and strips ASCII / unicode control characters. */
function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\p{Cc}/gu, '');
}

function toBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Fields SearchService.searchUsers() is allowed to sort by. Kept in sync
 * with the `allowedSortFields` allowlist in search.service.ts.
 */
export const USER_SEARCH_SORT_FIELDS = [
  'createdAt',
  'firstName',
  'lastName',
  'email',
  'role',
] as const;

export class SearchUsersDto {
  @ApiPropertyOptional({
    description: 'Full-text search query',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeString(value))
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by role', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by KYC verification status' })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  kycVerified?: boolean;

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
    enum: USER_SEARCH_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(USER_SEARCH_SORT_FIELDS)
  sortBy?: (typeof USER_SEARCH_SORT_FIELDS)[number];

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
