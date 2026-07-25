import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';

export enum BookingRoleFilter {
  HOST = 'host',
  GUEST = 'guest',
}

export class QueryBookingsDto {
  @ApiPropertyOptional({
    enum: BookingRoleFilter,
    description:
      'host: bookings on properties the caller owns. guest: bookings the caller made. Defaults to guest.',
  })
  @IsOptional()
  @IsEnum(BookingRoleFilter)
  role?: BookingRoleFilter;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
