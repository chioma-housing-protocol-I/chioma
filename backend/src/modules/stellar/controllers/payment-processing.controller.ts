import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import * as StellarSdk from '@stellar/stellar-sdk';
import { PaymentProcessingService } from '../services/payment-processing.service';
import {
  ProcessRentPaymentDto,
  SetFeeCollectorDto,
} from '../dto/payment-processing.dto';
import {
  STELLAR_PUBLIC_KEY_HEADER,
  STELLAR_SIGNATURE_HEADER,
  STELLAR_TIMESTAMP_HEADER,
} from '../middleware/stellar-request-signature.middleware';

/**
 * Swagger docs for the headers StellarRequestSignatureMiddleware requires on
 * every state-changing payment-processing endpoint.
 */
const SignedStellarRequest = () =>
  applyDecorators(
    ApiHeader({
      name: STELLAR_PUBLIC_KEY_HEADER,
      required: true,
      description: 'Stellar public key (G...) of the signer',
    }),
    ApiHeader({
      name: STELLAR_SIGNATURE_HEADER,
      required: true,
      description:
        'Base64 ed25519 signature of "chioma-stellar-request-v1\\n<METHOD>\\n<path>\\n<timestamp>\\n<sha256(body) hex>"',
    }),
    ApiHeader({
      name: STELLAR_TIMESTAMP_HEADER,
      required: true,
      description: 'Signing time as Unix epoch milliseconds',
    }),
    ApiUnauthorizedResponse({
      description: 'Missing, expired, replayed or forged Stellar signature',
    }),
  );

@ApiTags('Payment Processing')
@Controller('stellar/payment-processing')
export class PaymentProcessingController {
  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
  ) {}

  @Post('rent')
  @SignedStellarRequest()
  @ApiOperation({ summary: 'Process rent payment' })
  @ApiResponse({
    status: 201,
    description: 'Rent payment processed successfully',
  })
  async processRentPayment(@Body() dto: ProcessRentPaymentDto) {
    const callerKeypair = StellarSdk.Keypair.fromSecret(dto.userSecret);
    const hash = await this.paymentProcessingService.processRentPayment(
      dto.userAddress,
      dto.agreementId,
      dto.amount,
      callerKeypair,
    );
    return { success: true, transactionHash: hash };
  }

  @Post('fee-collector')
  @SignedStellarRequest()
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
