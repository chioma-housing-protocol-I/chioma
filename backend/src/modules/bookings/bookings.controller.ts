import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Booking } from './entities/booking.entity';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a short-stay booking request' })
  @ApiResponse({ status: 201, description: 'Booking created (pending)' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List bookings for the current user',
    description:
      'role=host returns bookings on properties the caller owns; role=guest (default) returns bookings the caller made.',
  })
  @ApiResponse({ status: 200, description: 'Bookings retrieved' })
  async findMine(
    @CurrentUser() user: User,
    @Query() query: QueryBookingsDto,
  ): Promise<Booking[]> {
    return this.bookingsService.findForUser(user.id, query);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Host confirms a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  async confirm(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Booking> {
    return this.bookingsService.confirm(user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Host declines/cancels a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Booking> {
    return this.bookingsService.cancel(user.id, id);
  }
}
