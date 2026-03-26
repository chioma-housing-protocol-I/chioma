import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodFiltersDto } from './dto/payment-method-filters.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';
import { PaymentScheduleFiltersDto } from './dto/payment-schedule-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLog } from '../audit/decorators/audit-log.decorator';
import { AuditAction, AuditLevel } from '../audit/entities/audit-log.entity';
import { AuditLogInterceptor } from '../audit/interceptors/audit-log.interceptor';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
@UseInterceptors(AuditLogInterceptor)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Record a payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @AuditLog({
    action: AuditAction.PAYMENT_COMPLETED,
    entityType: 'Payment',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async recordPayment(
    @Body() dto: CreatePaymentRecordDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.recordPayment(dto, req.user?.id || '');
  }

  @Get()
  @ApiOperation({ summary: 'List payments with filters' })
  @ApiResponse({ status: 200, description: 'Paginated payments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listPayments(
    @Query() filters: PaymentFiltersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.listPayments(filters, req.user?.id || '');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getPayment(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.getPaymentById(id, req.user?.id || '');
  }

  @Post(':id/refund')
  @AuditLog({
    action: AuditAction.PAYMENT_REFUNDED,
    entityType: 'Payment',
    level: AuditLevel.WARN,
    includeNewValues: true,
  })
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.processRefund(id, dto, req.user?.id || '');
  }

  @Get(':id/receipt')
  async generateReceipt(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ): Promise<unknown> {
    return this.paymentService.generateReceipt(id, req.user?.id || '');
  }
}

@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
@UseInterceptors(AuditLogInterceptor)
export class PaymentMethodController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'PaymentMethod',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async createPaymentMethod(
    @Body() dto: CreatePaymentMethodDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.createPaymentMethod(dto, req.user?.id || '');
  }

  @Get()
  async listPaymentMethods(
    @Query() filters: PaymentMethodFiltersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.listPaymentMethods(filters, req.user?.id || '');
  }

  @Patch(':id')
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'PaymentMethod',
    level: AuditLevel.INFO,
    includeOldValues: true,
    includeNewValues: true,
  })
  async updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.updatePaymentMethod(
      parseInt(id),
      dto,
      req.user?.id || '',
    );
  }

  @Delete(':id')
  @AuditLog({
    action: AuditAction.DELETE,
    entityType: 'PaymentMethod',
    level: AuditLevel.WARN,
    includeOldValues: true,
  })
  async deletePaymentMethod(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    await this.paymentService.removePaymentMethod(
      parseInt(id),
      req.user?.id || '',
    );
    return { success: true };
  }
}

// Separate controller for agreement-specific endpoints
@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('agreements')
export class AgreementPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payments')
  @ApiOperation({ summary: 'List payments for an agreement' })
  @ApiParam({ name: 'id', description: 'Agreement ID' })
  @ApiResponse({ status: 200, description: 'Payments for agreement' })
  async getPaymentsForAgreement(
    @Param('id') agreementId: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.listPayments(
      { agreementId },
      req.user?.id || '',
    );
  }
}

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments/schedules')
@UseInterceptors(AuditLogInterceptor)
export class PaymentScheduleController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create payment schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  @AuditLog({
    action: AuditAction.CREATE,
    entityType: 'PaymentSchedule',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async createSchedule(
    @Body() dto: CreatePaymentScheduleDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.createPaymentSchedule(dto, req.user?.id || '');
  }

  @Get()
  async listSchedules(
    @Query() filters: PaymentScheduleFiltersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.listPaymentSchedules(
      filters,
      req.user?.id || '',
    );
  }

  @Patch(':id')
  @AuditLog({
    action: AuditAction.UPDATE,
    entityType: 'PaymentSchedule',
    level: AuditLevel.INFO,
    includeOldValues: true,
    includeNewValues: true,
  })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentScheduleDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.updatePaymentSchedule(
      id,
      dto,
      req.user?.id || '',
    );
  }

  @Post(':id/run')
  @AuditLog({
    action: AuditAction.PAYMENT_INITIATED,
    entityType: 'PaymentSchedule',
    level: AuditLevel.INFO,
    includeNewValues: true,
  })
  async runSchedule(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.runPaymentSchedule(id, req.user?.id || '');
  }

  @Post('process-due')
  @AuditLog({
    action: AuditAction.BULK_OPERATION,
    entityType: 'PaymentSchedule',
    level: AuditLevel.INFO,
  })
  async processDueSchedules() {
    return this.paymentService.processDueSchedules();
  }
}
