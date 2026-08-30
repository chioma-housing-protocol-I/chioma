import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySecurityEventsDto {
  @ApiPropertyOptional({
    description: 'Look-back window in hours',
    default: 24,
    minimum: 1,
    maximum: 720,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  hours?: number = 24;

  @ApiPropertyOptional({
    description: 'Maximum number of events to return',
    default: 100,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}
