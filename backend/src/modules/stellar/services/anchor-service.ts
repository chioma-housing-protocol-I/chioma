import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  TransactionBuilder,
  Keypair,
  Networks,
  Operation,
  Asset,
  Memo,
} from '@stellar/stellar-sdk';

import { AnchorTransaction } from '../entities/anchor-transaction.entity';
import { SupportedCurrency } from '../entities/supported-currency.entity';
import { User } from '../../users/entities/user.entity';
import { DepositRequestDto } from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';
import { EscrowService } from './escrow.service';

interface AnchorConfig {
  apiUrl: string;
  apiKey: string;
  usdcAsset: string;
  supportedFiatCurrencies: string[];
}

interface AnchorDepositResponse {
  id: string;
  url: string;
  external_transaction_id: string;
}

interface AnchorWithdrawResponse {
  id: string;
  status: string;
  external_transaction_id: string;
}

@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);
  private readonly anchorConfig: AnchorConfig;

  constructor(
    @InjectRepository(AnchorTransaction)
    private readonly anchorTransactionRepository: Repository<AnchorTransaction>,
    @InjectRepository(SupportedCurrency)
    private readonly supportedCurrencyRepository: Repository<SupportedCurrency>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.anchorConfig = {
      apiUrl: this.configService.get<string>('ANCHOR_API_URL', 'https://api.anchor-provider.com'),
      apiKey: this.configService.get<string>('ANCHOR_API_KEY', 'your_api_key'),
      usdcAsset: this.configService.get<string>('ANCHOR_USDC_ASSET', 'USDC:GA5ZSEJYB37JYG2FYGN2G6XCZMJEJRVO5N4X7XRQOV7P6B3M3Q5YHJMX'),
      supportedFiatCurrencies: this.configService.get<string>('SUPPORTED_FIAT_CURRENCIES', 'USD,EUR,GBP,NGN').split(','),
    };
  }

  async initiateDeposit(
    userId: string,
    depositRequest: DepositRequestDto,
  ): Promise<AnchorTransaction> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate currency is supported
    if (!this.anchorConfig.supportedFiatCurrencies.includes(depositRequest.currency)) {
      throw new BadRequestException(`Currency ${depositRequest.currency} is not supported`);
    }

    // Check if currency exists in database
    const currency = await this.supportedCurrencyRepository.findOne({
      where: { code: depositRequest.currency, type: 'fiat', isActive: true },
    });
    if (!currency) {
      throw new BadRequestException(`Currency ${depositRequest.currency} is not configured`);
    }

    try {
      // Call anchor API for deposit
      const anchorResponse = await this.callAnchorDepositAPI(depositRequest);

      // Create transaction record
      const transaction = this.anchorTransactionRepository.create({
        userId,
        type: 'deposit',
        status: 'pending',
        amount: depositRequest.amount,
        fiatCurrency: depositRequest.currency,
        paymentMethod: depositRequest.type,
        walletAddress: depositRequest.walletAddress,
        anchorTransactionId: anchorResponse.id,
        anchorResponse,
        anchorProvider: 'default', // Could be configurable per currency
      });

      return await this.anchorTransactionRepository.save(transaction);
    } catch (error) {
      this.logger.error(`Failed to initiate deposit: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to initiate deposit');
    }
  }

  async initiateWithdrawal(
    userId: string,
    withdrawRequest: WithdrawRequestDto,
  ): Promise<AnchorTransaction> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate currency is supported
    if (!this.anchorConfig.supportedFiatCurrencies.includes(withdrawRequest.currency)) {
      throw new BadRequestException(`Currency ${withdrawRequest.currency} is not supported`);
    }

    // Check if currency exists in database
    const currency = await this.supportedCurrencyRepository.findOne({
      where: { code: withdrawRequest.currency, type: 'fiat', isActive: true },
    });
    if (!currency) {
      throw new BadRequestException(`Currency ${withdrawRequest.currency} is not configured`);
    }

    try {
      // First, lock/create escrow for USDC (this would need implementation)
      // For now, we'll assume the USDC is locked

      // Call anchor API for withdrawal
      const anchorResponse = await this.callAnchorWithdrawAPI(withdrawRequest);

      // Create transaction record
      const transaction = this.anchorTransactionRepository.create({
        userId,
        type: 'withdrawal',
        status: 'pending',
        amount: withdrawRequest.amount,
        fiatCurrency: withdrawRequest.currency,
        walletAddress: withdrawRequest.walletAddress,
        destination: withdrawRequest.destination,
        anchorTransactionId: anchorResponse.id,
        anchorResponse,
        anchorProvider: 'default',
      });

      return await this.anchorTransactionRepository.save(transaction);
    } catch (error) {
      this.logger.error(`Failed to initiate withdrawal: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to initiate withdrawal');
    }
  }

  async getTransactionStatus(transactionId: string): Promise<AnchorTransaction> {
    const transaction = await this.anchorTransactionRepository.findOne({
      where: { id: transactionId },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // If transaction is still pending, check with anchor
    if (transaction.status === 'pending' || transaction.status === 'processing') {
      try {
        const statusResponse = await this.callAnchorStatusAPI(transaction.anchorTransactionId);

        // Update transaction status based on anchor response
        transaction.status = this.mapAnchorStatusToInternal(statusResponse.status);
        transaction.anchorResponse = { ...transaction.anchorResponse, ...statusResponse };

        if (transaction.status === 'completed' && transaction.type === 'deposit') {
          // For completed deposits, we might need to send USDC to user's wallet
          await this.processCompletedDeposit(transaction);
        }

        await this.anchorTransactionRepository.save(transaction);
      } catch (error) {
        this.logger.error(`Failed to check transaction status: ${error.message}`, error.stack);
        // Don't throw error, just log it and return current status
      }
    }

    return transaction;
  }

  private async callAnchorDepositAPI(depositRequest: DepositRequestDto): Promise<AnchorDepositResponse> {
    const payload = {
      amount: depositRequest.amount,
      currency: depositRequest.currency,
      payment_method: depositRequest.type,
      wallet_address: depositRequest.walletAddress,
    };

    const response = await firstValueFrom(
      this.httpService.post(`${this.anchorConfig.apiUrl}/deposit`, payload, {
        headers: {
          'Authorization': `Bearer ${this.anchorConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data as AnchorDepositResponse;
  }

  private async callAnchorWithdrawAPI(withdrawRequest: WithdrawRequestDto): Promise<AnchorWithdrawResponse> {
    const payload = {
      amount: withdrawRequest.amount,
      currency: withdrawRequest.currency,
      destination: withdrawRequest.destination,
      wallet_address: withdrawRequest.walletAddress,
    };

    const response = await firstValueFrom(
      this.httpService.post(`${this.anchorConfig.apiUrl}/withdraw`, payload, {
        headers: {
          'Authorization': `Bearer ${this.anchorConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data as AnchorWithdrawResponse;
  }

  private async callAnchorStatusAPI(anchorTransactionId: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.anchorConfig.apiUrl}/transactions/${anchorTransactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.anchorConfig.apiKey}`,
        },
      }),
    );

    return response.data;
  }

  private mapAnchorStatusToInternal(anchorStatus: string): AnchorTransaction['status'] {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled',
    };

    return statusMap[anchorStatus] || 'pending';
  }

  private async processCompletedDeposit(transaction: AnchorTransaction): Promise<void> {
    // This would implement sending USDC to user's wallet
    // For now, just log the action needed
    this.logger.log(`Processing completed deposit ${transaction.id} - sending USDC to ${transaction.walletAddress}`);

    // TODO: Implement Stellar transaction to send USDC
    // This would involve:
    // 1. Building a Stellar transaction
    // 2. Signing it (would need private key for hot wallet)
    // 3. Submitting to Stellar network
    // 4. Updating transaction with Stellar tx hash
  }

  // Webhook handler for anchor callbacks (SEP-0024)
  async handleAnchorWebhook(webhookData: any): Promise<void> {
    const { transaction_id, status, stellar_transaction_id } = webhookData;

    const transaction = await this.anchorTransactionRepository.findOne({
      where: { anchorTransactionId: transaction_id },
    });

    if (!transaction) {
      this.logger.warn(`Received webhook for unknown transaction: ${transaction_id}`);
      return;
    }

    transaction.status = this.mapAnchorStatusToInternal(status);
    if (stellar_transaction_id) {
      transaction.stellarTransactionHash = stellar_transaction_id;
    }

    await this.anchorTransactionRepository.save(transaction);

    this.logger.log(`Updated transaction ${transaction.id} status to ${transaction.status}`);
  }
}