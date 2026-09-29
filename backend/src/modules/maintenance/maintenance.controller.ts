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
  ApiParam,
} from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AssignVendorDto,
  CreateMaintenanceRequestDto,
  CreateVendorDto,
  PayMaintenanceCostDto,
  ReviewCostEstimateDto,
  SubmitCostEstimateDto,
  UpdateMaintenanceStatusDto,
  CreateMaintenanceRequestDto,
  UpdateMaintenanceStatusDto,
  QueryMaintenanceDto,
} from './dto';
import { UserRole } from '../users/entities/user.entity';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { MaintenanceRequest } from './maintenance-request.entity';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('vendors')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Register a maintenance vendor/contractor' })
  @ApiBody({ type: CreateVendorDto })
  async createVendor(@Body() body: CreateVendorDto, @Req() req: any) {
    return this.maintenanceService.createVendor(body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vendors')
  @ApiOperation({ summary: 'List vendors registered by the current landlord' })
  async findVendors(@Req() req: any) {
    return this.maintenanceService.findVendors(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/vendor')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Assign a vendor to a maintenance request' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: AssignVendorDto })
  async assignVendor(
    @Param('id') id: string,
    @Body() body: AssignVendorDto,
    @Req() req: any,
  ) {
    return this.maintenanceService.assignVendor(id, body.vendorId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cost-estimate')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Submit a cost estimate for approval' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: SubmitCostEstimateDto })
  async submitCostEstimate(
    @Param('id') id: string,
    @Body() body: SubmitCostEstimateDto,
    @Req() req: any,
  ) {
    return this.maintenanceService.submitCostEstimate(
      id,
      body.estimatedCost,
      body.notes,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cost-estimate/review')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Approve or reject a submitted cost estimate' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: ReviewCostEstimateDto })
  async reviewCostEstimate(
    @Param('id') id: string,
    @Body() body: ReviewCostEstimateDto,
    @Req() req: any,
  ) {
    return this.maintenanceService.reviewCostEstimate(
      id,
      body.approved,
      body.reason,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/pay')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Pay an approved maintenance cost' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: PayMaintenanceCostDto })
  async payCost(
    @Param('id') id: string,
    @Body() body: PayMaintenanceCostDto,
    @Req() req: any,
  ) {
    return this.maintenanceService.payApprovedCost(
      id,
      body.paymentMethodId,
      body.agreementId,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create a new maintenance request (Tenants only)' })
  @ApiBody({ type: CreateMaintenanceRequestDto })
  @ApiResponse({ status: 201, description: 'Maintenance request created' })
  async create(@Body() body: CreateMaintenanceRequestDto, @Req() req: any) {
    if (req.user.role !== UserRole.USER)
      throw new ForbiddenException(
        'Only tenants can create maintenance requests',
      );
    const tenantId = req.user.id;
    return this.maintenanceService.create({ ...body, tenantId });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List maintenance requests with filters' })
  @ApiPaginatedResponse(MaintenanceRequest)
  async findAll(@Query() query: QueryMaintenanceDto) {
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
    const isLandlordOrAgent = [UserRole.ADMIN, UserRole.AGENT].includes(
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
