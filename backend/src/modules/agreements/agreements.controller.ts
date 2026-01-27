import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { UpdateAgreementDto } from './dto/update-agreement.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TerminateAgreementDto } from './dto/terminate-agreement.dto';
import { QueryAgreementsDto } from './dto/query-agreements.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Agreements')
@ApiBearerAuth('JWT-auth')
@Controller('api/agreements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  /**
   * POST /api/agreements
   * Create a new rent agreement
   * Only landlords can create agreements
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.LANDLORD, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new rent agreement' })
  @ApiResponse({ status: 201, description: 'Agreement created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires landlord role' })
  async create(
    @Body() createAgreementDto: CreateAgreementDto,
    @CurrentUser() user: any,
  ) {
    return await this.agreementsService.create(createAgreementDto, user.id);
  }

  /**
   * GET /api/agreements
   * List all agreements with optional filters
   * Users can only see their own agreements
   */
  @Get()
  @ApiOperation({ summary: 'List agreements for the current user' })
  @ApiResponse({ status: 200, description: 'List of agreements' })
  async findAll(@Query() query: QueryAgreementsDto, @CurrentUser() user: any) {
    return await this.agreementsService.findAll(query, user.id, user.role);
  }

  /**
   * GET /api/agreements/:id
   * Get a specific agreement by ID
   * Users can only view agreements they are party to
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get agreement details' })
  @ApiResponse({ status: 200, description: 'Agreement details' })
  @ApiResponse({ status: 404, description: 'Agreement not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.agreementsService.findOne(id, user.id, user.role);
  }

  /**
   * PUT /api/agreements/:id
   * Update an agreement
   * Only the landlord who owns the agreement can update it
   */
  @Put(':id')
  @Roles(UserRole.LANDLORD, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an agreement' })
  @ApiResponse({ status: 200, description: 'Agreement updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateAgreementDto: UpdateAgreementDto,
    @CurrentUser() user: any,
  ) {
    return await this.agreementsService.update(id, updateAgreementDto, user.id, user.role);
  }

  /**
   * DELETE /api/agreements/:id
   * Terminate an agreement (soft delete)
   * Only landlord or admin can terminate
   */
  @Delete(':id')
  @Roles(UserRole.LANDLORD, UserRole.ADMIN)
  @ApiOperation({ summary: 'Terminate an agreement' })
  @ApiResponse({ status: 200, description: 'Agreement terminated successfully' })
  async terminate(
    @Param('id') id: string,
    @Body() terminateDto: TerminateAgreementDto,
    @CurrentUser() user: any,
  ) {
    return await this.agreementsService.terminate(id, terminateDto, user.id, user.role);
  }

  /**
   * POST /api/agreements/:id/pay
   * Record a payment for an agreement
   * Only tenants can make payments
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.TENANT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a payment for an agreement' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async recordPayment(
    @Param('id') id: string,
    @Body() recordPaymentDto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return await this.agreementsService.recordPayment(id, recordPaymentDto, user.id);
  }

  /**
   * GET /api/agreements/:id/payments
   * Get all payments for an agreement
   * Both landlord and tenant can view payments
   */
  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payments for an agreement' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async getPayments(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.agreementsService.getPayments(id, user.id, user.role);
  }
}
