import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SorobanRpc } from '@stellar/stellar-sdk';

export enum TransactionPollingState {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

export interface TransactionPollingResult {
  state: TransactionPollingState;
  hash: string;
  finalStatus?: string;
  errorMessage?: string;
  attemptsUsed: number;
}

export interface PollingConfig {
  /** Maximum number of polling attempts (default: 30) */
  maxAttempts?: number;
  /** Initial delay in ms between polls (default: 1000) */
  initialDelayMs?: number;
  /** Backoff multiplier for exponential backoff (default: 1.5) */
  backoffMultiplier?: number;
  /** Maximum delay between polls in ms (default: 30000) */
  maxDelayMs?: number;
}

/**
 * Centralized transaction polling service for Soroban operations.
 * Implements exponential backoff, timeout handling, and state distinction.
 */
@Injectable()
export class TransactionPollingService {
  private readonly logger = new Logger(TransactionPollingService.name);
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
  }

  /**
   * Poll transaction status with exponential backoff.
   * Distinguishes between pending, succeeded, failed, and timeout states.
   *
   * @param transactionHash - The transaction hash to poll
   * @param config - Configuration for polling behavior
   * @returns Transaction polling result with state and attempt count
   */
  async pollTransactionStatus(
    transactionHash: string,
    config: PollingConfig = {},
  ): Promise<TransactionPollingResult> {
    const {
      maxAttempts = 30,
      initialDelayMs = 1000,
      backoffMultiplier = 1.5,
      maxDelayMs = 30000,
    } = config;

    const server = new SorobanRpc.Server(this.rpcUrl);
    let delayMs = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Wait before polling (except on first attempt)
        if (attempt > 1) {
          await this.delay(delayMs);
          // Apply exponential backoff
          delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
        }

        const txResponse = await server.getTransaction(transactionHash);

        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          this.logger.log(
            `Transaction ${transactionHash} succeeded after ${attempt} attempts`,
          );
          return {
            state: TransactionPollingState.SUCCEEDED,
            hash: transactionHash,
            finalStatus: txResponse.status,
            attemptsUsed: attempt,
          };
        }

        if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
          this.logger.warn(
            `Transaction ${transactionHash} failed after ${attempt} attempts`,
          );
          return {
            state: TransactionPollingState.FAILED,
            hash: transactionHash,
            finalStatus: txResponse.status,
            errorMessage: this.extractTransactionError(txResponse),
            attemptsUsed: attempt,
          };
        }

        // Status is NOT_FOUND, PENDING, etc. - continue polling
        this.logger.debug(
          `Transaction ${transactionHash} status: ${txResponse.status} (attempt ${attempt}/${maxAttempts})`,
        );
      } catch (error) {
        this.logger.error(
          `Error polling transaction ${transactionHash}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    // Max attempts exceeded
    this.logger.error(
      `Transaction ${transactionHash} polling timeout after ${maxAttempts} attempts`,
    );
    return {
      state: TransactionPollingState.TIMEOUT,
      hash: transactionHash,
      errorMessage: `Transaction polling timeout after ${maxAttempts} attempts with initial delay ${initialDelayMs}ms`,
      attemptsUsed: maxAttempts,
    };
  }

  /**
   * Poll with strict mode - throws on failure or timeout instead of returning result
   */
  async pollTransactionStatusStrict(
    transactionHash: string,
    config: PollingConfig = {},
  ): Promise<string> {
    const result = await this.pollTransactionStatus(transactionHash, config);

    if (result.state === TransactionPollingState.SUCCEEDED) {
      return result.hash;
    }

    if (result.state === TransactionPollingState.FAILED) {
      throw new Error(
        `Transaction failed: ${result.hash} - ${result.errorMessage || 'Unknown error'}`,
      );
    }

    throw new Error(
      `Transaction polling failed: ${result.hash} - ${result.errorMessage || 'Timeout'}`,
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractTransactionError(txResponse: any): string {
    try {
      if (txResponse.errorResult) {
        return JSON.stringify(txResponse.errorResult);
      }
      if (txResponse.result) {
        return JSON.stringify(txResponse.result);
      }
    } catch {
      // Fallback to generic message
    }
    return 'Transaction failed on-chain';
  }
}
