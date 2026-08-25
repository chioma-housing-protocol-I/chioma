import { IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateProratedRentDto {
  @ApiProperty({
    example: 1500.0,
    description: 'Full monthly rent amount',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyRent: number;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Move-in date for proration calculation (ISO 8601)',
  })
  @IsDateString()
  moveInDate: string;
}
