import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SublettingService } from './subletting.service';
import { RequestSublettingDto } from './dto/request-subletting.dto';
import { ApproveSublettingDto } from './dto/approve-subletting.dto';
import { DenySublettingDto } from './dto/deny-subletting.dto';
import {
  SubletRequestStatus,
  SubletRequest,
} from './entities/sublet-request.entity';
import { SubletBooking } from './entities/sublet-booking.entity';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

@Controller('api/subletting')
@UseGuards(JwtAuthGuard)
@ApiTags('Subletting')
export class SublettingController {
  constructor(private readonly sublettingService: SublettingService) {}

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Request subletting' })
  @Post('request')
  async requestSubletting(
    @Body() dto: RequestSublettingDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sublettingService.requestSubletting(dto, req.user?.id ?? '');
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get subletting requests' })
  @Get('requests')
  @ApiPaginatedResponse(SubletRequest)
  async getSublettingRequests(
    @Query('status') status: SubletRequestStatus | undefined,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sublettingService.getSublettingRequests(
      req.user?.id ?? '',
      status,
      Number(page),
      Number(limit),
    );
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiOperation({ summary: 'Approve subletting' })
  @Patch('requests/:requestId/approve')
  async approveSubletting(
    @Param('requestId') requestId: string,
    @Body() dto: ApproveSublettingDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sublettingService.approveSubletting(
      requestId,
      dto,
      req.user?.id ?? '',
    );
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiOperation({ summary: 'Deny subletting' })
  @Patch('requests/:requestId/deny')
  async denySubletting(
    @Param('requestId') requestId: string,
    @Body() dto: DenySublettingDto,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sublettingService.denySubletting(
      requestId,
      dto,
      req.user?.id ?? '',
    );
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get sublet bookings' })
  @Get('bookings')
  @ApiPaginatedResponse(SubletBooking)
  async getSubletBookings(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: { user?: { id: string } },
  ) {
    return this.sublettingService.getTenantSubletBookings(
      req.user?.id ?? '',
      Number(page),
      Number(limit),
    );
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get tenant earnings' })
  @Get('earnings')
  async getTenantEarnings(@Req() req: { user?: { id: string } }) {
    return this.sublettingService.getTenantEarnings(req.user?.id ?? '');
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get landlord earnings' })
  @Get('landlord-earnings')
  async getLandlordEarnings(@Req() req: { user?: { id: string } }) {
    return this.sublettingService.getLandlordEarnings(req.user?.id ?? '');
  }
}
