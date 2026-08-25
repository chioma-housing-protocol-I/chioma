import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateLateFeeDto {
  @ApiProperty({
    example: 1500.0,
    description: 'Monthly rent amount',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @ApiProperty({
    example: 10,
    description: 'Number of days the payment is late',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  daysLate: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Grace period in days before late fees apply',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  gracePeriodDays?: number;

  @ApiPropertyOptional({
    example: 0.05,
    description: 'Daily late fee rate as a decimal (e.g., 0.05 = 5% per day)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lateFeeRate?: number;
}
