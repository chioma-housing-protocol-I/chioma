import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants/business-rules.constants';

/**
 * Shared query DTO for every paginated list endpoint (#1614).
 *
 * Apply directly with `@Query() query: PaginationQueryDto`, or extend it to
 * add endpoint-specific filters (e.g. `class FindPropertiesDto extends
 * PaginationQueryDto { @IsOptional() city?: string }`). Values are validated
 * and coerced to numbers by the global `ValidationPipe` (`transform: true`),
 * so `query.page`/`query.limit` are always safe to pass straight into
 * `PaginationUtils` or a repository's `skip`/`take`.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number = DEFAULT_PAGE_SIZE;
}
