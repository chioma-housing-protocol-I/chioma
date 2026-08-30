import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../entities/booking.entity';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum BookingRoleFilter {
  HOST = 'host',
  GUEST = 'guest',
}

export class QueryBookingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: BookingRoleFilter,
    example: 'guest',
    description:
      'host: bookings on properties the caller owns. guest: bookings the caller made. Defaults to guest.',
  })
  @IsOptional()
  @IsEnum(BookingRoleFilter)
  role?: BookingRoleFilter;

  @ApiPropertyOptional({
    enum: BookingStatus,
    example: 'CONFIRMED',
    description: 'Filter by booking status',
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
