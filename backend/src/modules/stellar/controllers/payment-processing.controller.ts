import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as StellarSdk from '@stellar/stellar-sdk';
import { PaymentProcessingService } from '../services/payment-processing.service';
import {
  ProcessRentPaymentDto,
  SetFeeCollectorDto,
} from '../dto/payment-processing.dto';

@ApiTags('Payment Processing')
@Controller('stellar/payment-processing')
export class PaymentProcessingController {
  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
  ) {}

  @Post('rent')
  @ApiOperation({ summary: 'Process rent payment' })
  @ApiResponse({
    status: 201,
    description: 'Rent payment processed successfully',
  })
  async processRentPayment(@Body() dto: ProcessRentPaymentDto) {
    const callerKeypair = StellarSdk.Keypair.fromSecret(dto.tenantSecret);
    const hash = await this.paymentProcessingService.processRentPayment(
      dto.tenantAddress,
      dto.agreementId,
      dto.amount,
      callerKeypair,
    );
    return { success: true, transactionHash: hash };
  }

  @Post('fee-collector')
  @ApiOperation({ summary: 'Set platform fee collector' })
  @ApiResponse({
    status: 200,
    description: 'Platform fee collector updated successfully',
  })
  async setPlatformFeeCollector(@Body() dto: SetFeeCollectorDto) {
    const hash = await this.paymentProcessingService.setPlatformFeeCollector(
      dto.collectorAddress,
    );
    return { success: true, transactionHash: hash };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total payment count' })
  @ApiResponse({
    status: 200,
    description: 'Returns the total number of payments',
  })
  async getPaymentCount() {
    const count = await this.paymentProcessingService.getPaymentCount();
    return { count };
  }

  @Get('total-paid/:agreementId')
  @ApiOperation({ summary: 'Get total amount paid for a specific agreement' })
  @ApiResponse({ status: 200, description: 'Returns the total amount paid' })
  async getTotalPaid(@Param('agreementId') agreementId: string) {
    const totalPaid =
      await this.paymentProcessingService.getTotalPaid(agreementId);
    return { agreementId, totalPaid };
  }
}
