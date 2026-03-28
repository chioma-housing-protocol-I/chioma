import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RenewAgreementDto {
  @ApiPropertyOptional({
    description: 'Number of months to extend the lease end date from the current end date',
    example: 12,
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  extendMonths?: number;
}
