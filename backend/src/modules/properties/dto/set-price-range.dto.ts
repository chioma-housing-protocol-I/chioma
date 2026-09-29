import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class SetPriceRangeDto {
  @ApiProperty({ example: '2026-06-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 250.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description:
      'Only apply to these weekdays (0=Sunday … 6=Saturday), e.g. [5,6] for weekend pricing',
    example: [5, 6],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];
}
