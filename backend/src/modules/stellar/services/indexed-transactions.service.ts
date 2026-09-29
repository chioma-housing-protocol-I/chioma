import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { IndexedTransaction } from '../../transactions/entities/indexed-transaction.entity';
import {
  IndexedTransactionStatusFilter,
  QueryIndexedTransactionsDto,
} from '../dto/query-indexed-transactions.dto';

export type IndexedTransactionStatus =
  'pending' | 'indexed' | 'confirmed' | 'failed';

export interface IndexedTransactionRecord extends IndexedTransaction {
  indexingStatus: IndexedTransactionStatus;
  retryCount: number;
  blockNumber: number;
  blockchainConfirmation: 'confirmed' | 'unconfirmed' | 'failed';
  dataIndexed: number;
}

export interface IndexedTransactionStats {
  total: number;
  pending: number;
  indexed: number;
  confirmed: number;
  failed: number;
  averageIndexingTimeSeconds: number;
  successRate: number;
}

@Injectable()
export class IndexedTransactionsService {
  constructor(
    @InjectRepository(IndexedTransaction)
    private readonly indexedTransactionRepository: Repository<IndexedTransaction>,
  ) {}

  async listTransactions(query: QueryIndexedTransactionsDto): Promise<{
    data: IndexedTransactionRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder =
      this.indexedTransactionRepository.createQueryBuilder(
        'indexedTransaction',
      );

    if (query.status) {
      this.applyStatusFilter(queryBuilder, query.status);
    }

    if (query.startDate) {
      queryBuilder.andWhere('indexedTransaction.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('indexedTransaction.createdAt <= :endDate', {
        endDate,
      });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(CAST(indexedTransaction.id AS TEXT)) LIKE :search', {
            search,
          })
            .orWhere('LOWER(indexedTransaction.transactionHash) LIKE :search', {
              search,
            })
            .orWhere('LOWER(indexedTransaction.sourceAccount) LIKE :search', {
              search,
            })
            .orWhere(
              "LOWER(COALESCE(indexedTransaction.destinationAccount, '')) LIKE :search",
              { search },
            )
            .orWhere(
              "LOWER(COALESCE(CAST(indexedTransaction.agreementId AS TEXT), '')) LIKE :search",
              { search },
            )
            .orWhere(
              "LOWER(COALESCE(CAST(indexedTransaction.paymentId AS TEXT), '')) LIKE :search",
              { search },
            )
            .orWhere(
              "LOWER(COALESCE(CAST(indexedTransaction.propertyId AS TEXT), '')) LIKE :search",
              { search },
            )
            .orWhere(
              "LOWER(COALESCE(indexedTransaction.memo, '')) LIKE :search",
              {
                search,
              },
            )
            .orWhere(
              'LOWER(CAST(indexedTransaction.metadata AS TEXT)) LIKE :search',
              {
                search,
              },
            );
        }),
      );
    }

    queryBuilder
      .orderBy('indexedTransaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await queryBuilder.getManyAndCount();

    return {
      data: rows.map((row) => this.toRecord(row)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getTransaction(id: string): Promise<IndexedTransactionRecord> {
    const transaction = await this.indexedTransactionRepository.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Indexed transaction not found');
    }

    return this.toRecord(transaction);
  }

  async getTransactionStats(): Promise<IndexedTransactionStats> {
    const rows = await this.indexedTransactionRepository.find();

    const stats: IndexedTransactionStats = {
      total: rows.length,
      pending: 0,
      indexed: 0,
      confirmed: 0,
      failed: 0,
      averageIndexingTimeSeconds: 0,
      successRate: 0,
    };

    const durations: number[] = [];

    for (const row of rows) {
      const status = this.getIndexingStatus(row);
      stats[status] += 1;

      if (row.indexed && row.indexedAt) {
        const durationSeconds = Math.max(
          0,
          Math.round(
            (new Date(row.indexedAt).getTime() -
              new Date(row.createdAt).getTime()) /
              1000,
          ),
        );
        durations.push(durationSeconds);
      }
    }

    if (durations.length > 0) {
      stats.averageIndexingTimeSeconds = Math.round(
        durations.reduce((sum, value) => sum + value, 0) / durations.length,
      );
    }

    stats.successRate =
      stats.total === 0
        ? 0
        : Math.round(((stats.confirmed + stats.indexed) / stats.total) * 100);

    return stats;
  }

  private applyStatusFilter(
    queryBuilder: SelectQueryBuilder<IndexedTransaction>,
    status: IndexedTransactionStatusFilter,
  ) {
    const failedClause =
      'LOWER(CAST(indexedTransaction.metadata AS TEXT)) LIKE :failedSearch';

    if (status === 'failed') {
      queryBuilder.andWhere(failedClause, { failedSearch: '%failed%' });
      return;
    }

    if (status === 'confirmed') {
      queryBuilder
        .andWhere('indexedTransaction.indexed = :indexed', { indexed: true })
        .andWhere('indexedTransaction.successful = :successful', {
          successful: true,
        })
        .andWhere(`NOT (${failedClause})`, { failedSearch: '%failed%' });
      return;
    }

    if (status === 'indexed') {
      queryBuilder
        .andWhere('indexedTransaction.indexed = :indexed', { indexed: true })
        .andWhere('indexedTransaction.successful = :successful', {
          successful: false,
        })
        .andWhere(`NOT (${failedClause})`, { failedSearch: '%failed%' });
      return;
    }

    queryBuilder
      .andWhere('indexedTransaction.indexed = :indexed', { indexed: false })
      .andWhere(`NOT (${failedClause})`, { failedSearch: '%failed%' });
  }

  private toRecord(transaction: IndexedTransaction): IndexedTransactionRecord {
    const indexingStatus = this.getIndexingStatus(transaction);

    return {
      ...transaction,
      indexingStatus,
      retryCount: this.getRetryCount(transaction),
      blockNumber: transaction.ledger,
      blockchainConfirmation:
        indexingStatus === 'confirmed'
          ? 'confirmed'
          : indexingStatus === 'failed'
            ? 'failed'
            : 'unconfirmed',
      dataIndexed:
        transaction.operations?.length ??
        Object.keys(transaction.metadata ?? {}).length,
    };
  }

  private getIndexingStatus(
    transaction: IndexedTransaction,
  ): IndexedTransactionStatus {
    const metadataText = JSON.stringify(
      transaction.metadata ?? {},
    ).toLowerCase();

    if (metadataText.includes('failed') || metadataText.includes('error')) {
      return 'failed';
    }

    if (transaction.indexed && transaction.successful) {
      return 'confirmed';
    }

    if (transaction.indexed) {
      return 'indexed';
    }

    return 'pending';
  }

  private getRetryCount(transaction: IndexedTransaction): number {
    const rawRetryCount =
      transaction.metadata?.retryCount ??
      transaction.metadata?.retries ??
      transaction.metadata?.retry_count;
    const parsed = Number(rawRetryCount);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
}
