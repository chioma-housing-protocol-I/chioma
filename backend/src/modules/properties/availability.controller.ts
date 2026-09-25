import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { BlockDatesDto } from './dto/block-dates.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { SetPriceRangeDto } from './dto/set-price-range.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Property Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('properties/:propertyId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get availability calendar for a date range' })
  @ApiParam({ name: 'propertyId', type: String })
  async getCalendar(
    @Param('propertyId') propertyId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailability(
      propertyId,
      query.startDate,
      query.endDate,
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update availability for a date range' })
  @ApiParam({ name: 'propertyId', type: String })
  async updateAvailability(
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdateAvailabilityDto,
    @Req() req: Request,
  ) {
    return this.availabilityService.updateAvailability(
      propertyId,
      dto,
      (req.user as any).id,
    );
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a list of dates' })
  @ApiParam({ name: 'propertyId', type: String })
  async blockDates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BlockDatesDto,
    @Req() req: Request,
  ) {
    await this.availabilityService.blockDates(
      propertyId,
      dto,
      (req.user as any).id,
    );
    return { success: true };
  }

  @Post('unblock')
  @ApiOperation({ summary: 'Unblock a list of dates' })
  @ApiParam({ name: 'propertyId', type: String })
  async unblockDates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BlockDatesDto,
    @Req() req: Request,
  ) {
    await this.availabilityService.unblockDates(
      propertyId,
      dto,
      (req.user as any).id,
    );
    return { success: true };
  }

  @Post('price')
  @ApiOperation({ summary: 'Set custom price for a specific date' })
  @ApiParam({ name: 'propertyId', type: String })
  async setPrice(
    @Param('propertyId') propertyId: string,
    @Body() dto: SetPriceDto,
    @Req() req: Request,
  ) {
    return this.availabilityService.setPrice(
      propertyId,
      dto,
      (req.user as any).id,
    );
  }

  @Post('price-range')
  @ApiOperation({
    summary:
      'Set custom price across a date range (optionally only on given weekdays)',
  })
  @ApiParam({ name: 'propertyId', type: String })
  async setPriceRange(
    @Param('propertyId') propertyId: string,
    @Body() dto: SetPriceRangeDto,
    @Req() req: Request,
  ) {
    return this.availabilityService.setPriceRange(
      propertyId,
      dto,
      (req.user as any).id,
    );
  }

  @Public()
  @Get('calendar.ics')
  @Header('Cache-Control', 'public, max-age=900')
  @ApiOperation({
    summary: 'iCal (RFC 5545) feed of blocked dates for external calendars',
  })
  @ApiParam({ name: 'propertyId', type: String })
  async getICalFeed(
    @Param('propertyId') propertyId: string,
    @Res() res: Response,
  ) {
    const feed = await this.availabilityService.getICalFeed(propertyId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="property-${propertyId}.ics"`,
    );
    res.send(feed);
  }
}
