import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingPaymentMethod } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty({ description: 'Property being booked' })
  @IsNotEmpty()
  @IsUUID()
  propertyId: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsNotEmpty()
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: '2026-08-05' })
  @IsNotEmpty()
  @IsDateString()
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: 32, default: 1 })
  @IsInt()
  @Min(1)
  @Max(32)
  guests: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  @ApiPropertyOptional({ enum: BookingPaymentMethod })
  @IsOptional()
  @IsEnum(BookingPaymentMethod)
  paymentMethod?: BookingPaymentMethod;
}
