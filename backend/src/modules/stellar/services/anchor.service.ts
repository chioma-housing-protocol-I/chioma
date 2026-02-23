import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  AnchorTransaction,
  AnchorTransactionType,
  AnchorTransactionStatus,
} from '../../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../../transactions/entities/supported-currency.entity';
import { DepositRequestDto } from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';

interface AnchorDepositResponse {
  id: string;
  how: string;
  eta?: number;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

interface AnchorWithdrawResponse {
  id: string;
  account_id: string;
  memo_type?: string;
  memo?: string;
  eta?: number;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

interface AnchorTransactionResponse {
  transaction: {
    id: string;
    status: string;
    status_eta?: number;
    amount_in?: string;
    amount_out?: string;
    amount_fee?: string;
    stellar_transaction_id?: string;
    external_transaction_id?: string;
    message?: string;
  };
}

@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly anchorApiUrl: string;
  private readonly anchorApiKey: string;
  private readonly supportedCurrencies: string[];

  constructor(
    @InjectRepository(AnchorTransaction)
    private anchorTransactionRepo: Repository<AnchorTransaction>,
    @InjectRepository(SupportedCurrency)
    private supportedCurrencyRepo: Repository<SupportedCurrency>,
    private configService: ConfigService,
  ) {
    this.anchorApiUrl = this.configService.get<string>('ANCHOR_API_URL') || '';
    this.anchorApiKey = this.configService.get<string>('ANCHOR_API_KEY') || '';
    this.supportedCurrencies =
      this.configService
        .get<string>('SUPPORTED_FIAT_CURRENCIES', 'USD,EUR,GBP,NGN')
        .split(',') || [];

    this.axiosInstance = axios.create({
      baseURL: this.anchorApiUrl,
      headers: {
        Authorization: `Bearer ${this.anchorApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async initiateDeposit(dto: DepositRequestDto): Promise<AnchorTransaction> {
    this.logger.log(`Initiating deposit for ${dto.walletAddress}`);

    await this.validateCurrency(dto.currency);

    const transaction = this.anchorTransactionRepo.create({
      type: AnchorTransactionType.DEPOSIT,
      status: AnchorTransactionStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      walletAddress: dto.walletAddress,
      paymentMethod: dto.type,
    });

    await this.anchorTransactionRepo.save(transaction);

    try {
      const response = await this.axiosInstance.post<AnchorDepositResponse>(
        '/sep24/transactions/deposit/interactive',
        {
          asset_code: dto.currency,
          account: dto.walletAddress,
          amount: dto.amount.toString(),
          type: dto.type,
        },
      );

      transaction.anchorTransactionId = response.data.id;
      transaction.metadata = {
        how: response.data.how,
        eta: response.data.eta,
        fee_fixed: response.data.fee_fixed,
        fee_percent: response.data.fee_percent,
      };

      await this.anchorTransactionRepo.save(transaction);
      this.logger.log(`Deposit initiated: ${transaction.id}`);

      return transaction;
    } catch (error) {
      transaction.status = AnchorTransactionStatus.FAILED;
      await this.anchorTransactionRepo.save(transaction);
      this.logger.error(`Deposit failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate deposit');
    }
  }

  async initiateWithdrawal(
    dto: WithdrawRequestDto,
  ): Promise<AnchorTransaction> {
    this.logger.log(`Initiating withdrawal for ${dto.walletAddress}`);

    await this.validateCurrency(dto.currency);

    const transaction = this.anchorTransactionRepo.create({
      type: AnchorTransactionType.WITHDRAWAL,
      status: AnchorTransactionStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      walletAddress: dto.walletAddress,
      destination: dto.destination,
    });

    await this.anchorTransactionRepo.save(transaction);

    try {
      const response = await this.axiosInstance.post<AnchorWithdrawResponse>(
        '/sep24/transactions/withdraw/interactive',
        {
          asset_code: dto.currency,
          account: dto.walletAddress,
          amount: dto.amount.toString(),
          dest: dto.destination,
        },
      );

      transaction.anchorTransactionId = response.data.id;
      transaction.metadata = {
        account_id: response.data.account_id,
        memo_type: response.data.memo_type,
        memo: response.data.memo,
        eta: response.data.eta,
        fee_fixed: response.data.fee_fixed,
        fee_percent: response.data.fee_percent,
      };

      await this.anchorTransactionRepo.save(transaction);
      this.logger.log(`Withdrawal initiated: ${transaction.id}`);

      return transaction;
    } catch (error) {
      transaction.status = AnchorTransactionStatus.FAILED;
      await this.anchorTransactionRepo.save(transaction);
      this.logger.error(`Withdrawal failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate withdrawal');
    }
  }

  async getTransactionStatus(id: string): Promise<AnchorTransaction> {
    const transaction = await this.anchorTransactionRepo.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.anchorTransactionId) {
      try {
        const response =
          await this.axiosInstance.get<AnchorTransactionResponse>(
            `/sep24/transaction?id=${transaction.anchorTransactionId}`,
          );

        const anchorTx = response.data.transaction;
        transaction.status = this.mapAnchorStatus(anchorTx.status);
        transaction.stellarTransactionId = anchorTx.stellar_transaction_id;
        transaction.metadata = {
          ...transaction.metadata,
          amount_in: anchorTx.amount_in,
          amount_out: anchorTx.amount_out,
          amount_fee: anchorTx.amount_fee,
          external_transaction_id: anchorTx.external_transaction_id,
          message: anchorTx.message,
        };

        await this.anchorTransactionRepo.save(transaction);
      } catch (error) {
        this.logger.error(
          `Failed to fetch transaction status: ${error.message}`,
        );
      }
    }

    return transaction;
  }

  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Received webhook: ${JSON.stringify(payload)}`);

    const { id, status, stellar_transaction_id } = payload;

    const transaction = await this.anchorTransactionRepo.findOne({
      where: { anchorTransactionId: id },
    });

    if (transaction) {
      transaction.status = this.mapAnchorStatus(status);
      transaction.stellarTransactionId = stellar_transaction_id;
      transaction.metadata = { ...transaction.metadata, ...payload };
      await this.anchorTransactionRepo.save(transaction);
      this.logger.log(`Transaction ${transaction.id} updated via webhook`);
    }
  }

  private async validateCurrency(currency: string): Promise<void> {
    if (!this.supportedCurrencies.includes(currency)) {
      throw new BadRequestException(`Currency ${currency} not supported`);
    }

    const supportedCurrency = await this.supportedCurrencyRepo.findOne({
      where: { code: currency, isActive: true },
    });

    if (!supportedCurrency) {
      throw new BadRequestException(`Currency ${currency} not configured`);
    }
  }

  private mapAnchorStatus(anchorStatus: string): AnchorTransactionStatus {
    const statusMap: Record<string, AnchorTransactionStatus> = {
      pending_user_transfer_start: AnchorTransactionStatus.PENDING,
      pending_anchor: AnchorTransactionStatus.PROCESSING,
      pending_stellar: AnchorTransactionStatus.PROCESSING,
      pending_external: AnchorTransactionStatus.PROCESSING,
      pending_trust: AnchorTransactionStatus.PROCESSING,
      pending_user: AnchorTransactionStatus.PROCESSING,
      completed: AnchorTransactionStatus.COMPLETED,
      refunded: AnchorTransactionStatus.REFUNDED,
      expired: AnchorTransactionStatus.FAILED,
      error: AnchorTransactionStatus.FAILED,
    };

    return statusMap[anchorStatus] || AnchorTransactionStatus.PENDING;
  }
}
