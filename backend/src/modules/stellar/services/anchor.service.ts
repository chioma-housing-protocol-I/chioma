import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository } from 'typeorm';
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
import { QueryAnchorTransactionsDto } from '../dto/query-anchor-transactions.dto';

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

interface AnchorTransactionStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  refunded: number;
  verified: number;
  averageTimeToAnchorSeconds: number;
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

  async listTransactions(query: QueryAnchorTransactionsDto): Promise<{
    data: AnchorTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder =
      this.anchorTransactionRepo.createQueryBuilder('anchorTransaction');

    if (query.type) {
      queryBuilder.andWhere('anchorTransaction.type = :type', {
        type: query.type,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('anchorTransaction.status = :status', {
        status: query.status,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('anchorTransaction.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('anchorTransaction.createdAt <= :endDate', {
        endDate,
      });
    }

    if (query.search) {
      const search = `%${query.search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('anchorTransaction.id::text ILIKE :search', { search })
            .orWhere('anchorTransaction.anchorTransactionId ILIKE :search', {
              search,
            })
            .orWhere('anchorTransaction.stellarTransactionId ILIKE :search', {
              search,
            })
            .orWhere('anchorTransaction.walletAddress ILIKE :search', {
              search,
            })
            .orWhere('anchorTransaction.currency ILIKE :search', { search })
            .orWhere('anchorTransaction.destination ILIKE :search', {
              search,
            })
            .orWhere('anchorTransaction.memo ILIKE :search', { search });
        }),
      );
    }

    queryBuilder
      .orderBy('anchorTransaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getTransactionStats(): Promise<AnchorTransactionStats> {
    const [
      total,
      pending,
      processing,
      completed,
      failed,
      refunded,
      verified,
      terminalTransactions,
    ] = await Promise.all([
      this.anchorTransactionRepo.count(),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.PENDING },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.PROCESSING },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.COMPLETED },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.FAILED },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.REFUNDED },
      }),
      this.anchorTransactionRepo.count({
        where: { stellarTransactionId: Not(IsNull()) },
      }),
      this.anchorTransactionRepo.find({
        where: [
          { status: AnchorTransactionStatus.COMPLETED },
          { status: AnchorTransactionStatus.REFUNDED },
          { status: AnchorTransactionStatus.FAILED },
        ],
      }),
    ]);

    const averageTimeToAnchorSeconds =
      terminalTransactions.length > 0
        ? Math.round(
            terminalTransactions.reduce((totalSeconds, transaction) => {
              const createdAt = new Date(transaction.createdAt).getTime();
              const updatedAt = new Date(transaction.updatedAt).getTime();
              const durationSeconds = Math.max(
                0,
                Math.round((updatedAt - createdAt) / 1000),
              );
              return totalSeconds + durationSeconds;
            }, 0) / terminalTransactions.length,
          )
        : 0;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      refunded,
      verified,
      averageTimeToAnchorSeconds,
    };
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
