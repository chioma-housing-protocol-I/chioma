import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsNotEmpty()
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2026-09-05' })
  @IsNotEmpty()
  @IsDateString()
  checkOut: string;
}
