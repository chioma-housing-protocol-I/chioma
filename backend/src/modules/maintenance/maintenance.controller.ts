import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceStatus } from './maintenance-request.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMaintenanceRequestDto, UpdateMaintenanceStatusDto } from './dto';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('api/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create a new maintenance request (Tenants only)' })
  @ApiBody({ type: CreateMaintenanceRequestDto })
  @ApiResponse({ status: 201, description: 'Maintenance request created' })
  async create(@Body() body: CreateMaintenanceRequestDto, @Req() req: any) {
    if (req.user.role !== UserRole.TENANT)
      throw new ForbiddenException(
        'Only tenants can create maintenance requests',
      );
    const tenantId = req.user.id;
    return this.maintenanceService.create({ ...body, tenantId });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List maintenance requests with filters' })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiResponse({ status: 200, description: 'List of maintenance requests' })
  async findAll(@Query() query: any) {
    return this.maintenanceService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed maintenance request info' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Maintenance request details' })
  async findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Update maintenance request status (Landlords/Admins only)',
  })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateMaintenanceStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Maintenance request status updated',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateMaintenanceStatusDto,
    @Req() req: any,
  ) {
    const isLandlordOrAgent = [UserRole.LANDLORD, UserRole.ADMIN].includes(
      req.user.role,
    );
    if (!isLandlordOrAgent)
      throw new ForbiddenException(
        'Only landlords or admins can update status',
      );
    const userId = req.user.id;
    return this.maintenanceService.updateStatus(
      id,
      body.status,
      userId,
      isLandlordOrAgent,
    );
  }
}
