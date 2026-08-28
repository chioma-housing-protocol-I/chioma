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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { BlockDatesDto } from './dto/block-dates.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Express Request extended with the user object populated by Passport/JWT. */
interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Property Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('properties/:propertyId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @ApiResponse({ status: 200, description: 'Retrieved' })
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

  @ApiResponse({ status: 200, description: 'Updated' })
  @Put()
  @ApiOperation({ summary: 'Update availability for a date range' })
  @ApiParam({ name: 'propertyId', type: String })
  async updateAvailability(
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdateAvailabilityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.updateAvailability(
      propertyId,
      dto,
      req.user.id,
    );
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('block')
  @ApiOperation({ summary: 'Block a list of dates' })
  @ApiParam({ name: 'propertyId', type: String })
  async blockDates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BlockDatesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.availabilityService.blockDates(propertyId, dto, req.user.id);
    return { success: true };
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('unblock')
  @ApiOperation({ summary: 'Unblock a list of dates' })
  @ApiParam({ name: 'propertyId', type: String })
  async unblockDates(
    @Param('propertyId') propertyId: string,
    @Body() dto: BlockDatesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.availabilityService.unblockDates(propertyId, dto, req.user.id);
    return { success: true };
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('price')
  @ApiOperation({ summary: 'Set custom price for a specific date' })
  @ApiParam({ name: 'propertyId', type: String })
  async setPrice(
    @Param('propertyId') propertyId: string,
    @Body() dto: SetPriceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.availabilityService.setPrice(propertyId, dto, req.user.id);
  }
}
