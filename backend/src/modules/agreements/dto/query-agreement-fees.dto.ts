import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAgreementFeesDto {
  @ApiPropertyOptional({
    description:
      'Whole days after rent due date (used with grace period and late fee % to estimate late fee)',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  daysPastDue?: number;
}
