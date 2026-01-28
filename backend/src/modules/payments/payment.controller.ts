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
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodFiltersDto } from './dto/payment-method-filters.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { UpdatePaymentScheduleDto } from './dto/update-payment-schedule.dto';
import { PaymentScheduleFiltersDto } from './dto/payment-schedule-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.recordPayment(dto, req.user?.id || '');
  }

  @Get()
  async listPayments(
    @Query() filters: PaymentFiltersDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.listPayments(filters, req.user?.id || '');
  }

  @Get(':id')
  async getPayment(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.getPaymentById(id, req.user?.id || '');
  }

  @Post(':id/refund')
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
@Controller('api/payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
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
@UseGuards(JwtAuthGuard)
@Controller('api/agreements')
export class AgreementPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payments')
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

@UseGuards(JwtAuthGuard)
@Controller('api/payments/schedules')
export class PaymentScheduleController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
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
  async runSchedule(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.runPaymentSchedule(id, req.user?.id || '');
  }

  @Post('process-due')
  async processDueSchedules() {
    return this.paymentService.processDueSchedules();
  }
}
