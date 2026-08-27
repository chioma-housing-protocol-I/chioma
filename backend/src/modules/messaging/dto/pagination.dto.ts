import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Upper bound on page size so a caller cannot request the whole table. */
export const MESSAGING_LIST_MAX_LIMIT = 100;

export class PaginationQueryDto {
  // Query params arrive as strings and the global ValidationPipe does not
  // use implicit conversion, so these need an explicit @Type to reach @IsInt
  // (see PaymentFiltersDto for the same pattern).
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MESSAGING_LIST_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MESSAGING_LIST_MAX_LIMIT)
  limit?: number;
}
