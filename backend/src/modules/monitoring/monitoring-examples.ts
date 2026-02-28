// Example: Using Monitoring in Payment Service

import { Injectable } from '@nestjs/common';
import { MetricsService } from '../monitoring/metrics.service';
import { StructuredLoggerService } from '../monitoring/structured-logger.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async processPayment(paymentData: any) {
    const startTime = Date.now();

    try {
      this.logger.log('Processing payment', {
        paymentId: paymentData.id,
        amount: paymentData.amount,
      });

      // Process payment logic here
      const result = await this.executePayment(paymentData);

      // Record success metrics
      this.metricsService.recordRentPayment('success');
      this.metricsService.recordBlockchainTransaction('payment', 'success');

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordBlockchainDuration('payment', duration);

      this.logger.log('Payment processed successfully', {
        paymentId: paymentData.id,
        duration,
      });

      return result;
    } catch (error) {
      // Record failure metrics
      this.metricsService.recordRentPayment('failed');
      this.metricsService.recordBlockchainFailure('payment', error.message);

      this.logger.error('Payment processing failed', error.stack, {
        paymentId: paymentData.id,
        error: error.message,
      });

      throw error;
    }
  }

  private async executePayment(_paymentData: any) {
    // Payment execution logic
    return { success: true };
  }
}

// Example: Using Monitoring in NFT Service

@Injectable()
export class NftService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async mintNft(_agreementId: string, _landlordAddress: string) {
    const startTime = Date.now();

    try {
      this.logger.log('Minting NFT', {
        agreementId: _agreementId,
        landlordAddress: _landlordAddress,
      });

      // Mint NFT logic
      const result = await this.executeMint(_agreementId, _landlordAddress);

      // Record metrics
      this.metricsService.recordNftMint('rent_obligation');
      this.metricsService.recordBlockchainTransaction('nft_mint', 'success');

      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.recordBlockchainDuration('nft_mint', duration);

      this.logger.log('NFT minted successfully', {
        agreementId: _agreementId,
        txHash: result.txHash,
        duration,
      });

      return result;
    } catch (error) {
      this.metricsService.recordBlockchainFailure('nft_mint', error.message);

      this.logger.error('NFT minting failed', error.stack, {
        agreementId: _agreementId,
        error: error.message,
      });

      throw error;
    }
  }

  private async executeMint(agreementId: string, landlordAddress: string) {
    return { txHash: 'mock-tx-hash' };
  }
}
