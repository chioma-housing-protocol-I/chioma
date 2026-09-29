import {
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Upper bound on page size so a caller cannot request the whole table. */
export const PAYMENT_LIST_MAX_LIMIT = 100;
export const PAYMENT_LIST_DEFAULT_LIMIT = 20;

export class PaymentFiltersDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsOptional()
  @IsIn(['pending', 'completed', 'failed', 'refunded', 'partial_refund'])
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  // Query params arrive as strings and the global ValidationPipe does not use
  // implicit conversion, so these need an explicit @Type to reach @IsInt.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAYMENT_LIST_MAX_LIMIT)
  limit?: number;
}
