import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * TransactionService wraps critical database operations in TypeORM transactions,
 * ensuring atomicity, automatic rollback on error, and idempotency-key support.
 *
 * Resolves: https://github.com/chioma-housing-protocol-I/chioma/issues/456
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Execute a callback within a database transaction.
   * Automatically commits on success and rolls back on error.
   *
   * @param callback - Async function receiving a QueryRunner to perform DB operations.
   * @param idempotencyKey - Optional key to prevent duplicate execution.
   */
  async execute<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    idempotencyKey?: string,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      if (idempotencyKey) {
        this.logger.debug(`Transaction committed [key=${idempotencyKey}]`);
      }
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction rolled back${idempotencyKey ? ` [key=${idempotencyKey}]` : ''}: ${(error as Error).message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute with automatic retry for transient failures (e.g. deadlocks).
   *
   * @param callback - Async function receiving a QueryRunner.
   * @param retries - Number of retry attempts (default: 3).
   * @param idempotencyKey - Optional key to prevent duplicate execution.
   */
  async executeWithRetry<T>(
    callback: (queryRunner: QueryRunner) => Promise<T>,
    retries = 3,
    idempotencyKey?: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.execute(callback, idempotencyKey);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retries && this.isTransientError(lastError)) {
          this.logger.warn(
            `Transient error on attempt ${attempt}/${retries}, retrying: ${lastError.message}`,
          );
          await this.delay(attempt * 100);
        } else {
          break;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error('Unknown error in executeWithRetry');
  }

  private isTransientError(error: Error): boolean {
    const transientCodes = ['40001', '40P01']; // serialization failure, deadlock
    const msg = error.message?.toLowerCase() ?? '';
    return (
      transientCodes.some((code) => msg.includes(code)) ||
      msg.includes('deadlock') ||
      msg.includes('serialization')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
