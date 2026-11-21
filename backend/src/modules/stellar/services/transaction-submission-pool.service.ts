import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarConfig } from '../config/stellar.config';
import {
  extractStellarErrorMessage,
  isTransientStellarError,
} from './stellar-transaction-resilience';

export type PooledSubmitResult = {
  hash: string;
  ledger: number;
};

type QueueItem = {
  buildOperations: () => StellarSdk.xdr.Operation[];
  resolve: (result: PooledSubmitResult) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
};

type SourceQueue = {
  items: QueueItem[];
  timer: NodeJS.Timeout | null;
  inFlight: boolean;
};

type SubmitFn = (
  transaction: StellarSdk.Transaction,
) => Promise<PooledSubmitResult>;

/**
 * Pools Stellar transaction submissions to reduce network roundtrips and
 * contention. Submissions for the same source account are serialized and
 * coalesced within a short, bounded window so bursts can be submitted as a
 * single multi-operation transaction when possible. Each enqueued item resolves
 * or rejects independently based on the batch outcome.
 */
@Injectable()
export class TransactionSubmissionPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(TransactionSubmissionPoolService.name);
  private readonly queues = new Map<string, SourceQueue>();
  private readonly horizon: StellarSdk.Horizon.Server;
  private readonly networkPassphrase: string;
  private readonly baseFee: string;

  private readonly flushWindowMs: number;
  private readonly maxBatchSize: number;
  private readonly maxQueueSize: number;

  constructor(private readonly configService: ConfigService) {
    const stellarConfig = this.configService.get<StellarConfig>('stellar')!;
    this.horizon = new StellarSdk.Horizon.Server(stellarConfig.horizonUrl);
    this.networkPassphrase = stellarConfig.networkPassphrase;
    this.baseFee = stellarConfig.baseFee;

    this.flushWindowMs = this.readBoundedInt(
      process.env.STELLAR_SUBMISSION_POOL_FLUSH_MS,
      25,
      0,
      500,
    );
    this.maxBatchSize = this.readBoundedInt(
      process.env.STELLAR_SUBMISSION_POOL_MAX_BATCH,
      10,
      1,
      50,
    );
    this.maxQueueSize = this.readBoundedInt(
      process.env.STELLAR_SUBMISSION_POOL_MAX_QUEUE,
      200,
      10,
      2000,
    );
  }

  /**
   * Enqueue operations to be submitted for a source account. All operations in
   * the flushed batch execute in one Stellar transaction (atomic). The promise
   * resolves with the on-chain hash/ledger for that batch.
   */
  enqueue(params: {
    sourcePublicKey: string;
    sourceKeypair: StellarSdk.Keypair;
    buildOperations: () => StellarSdk.xdr.Operation[];
    submit: SubmitFn;
  }): Promise<PooledSubmitResult> {
    const queue = this.getOrCreateQueue(params.sourcePublicKey);
    if (queue.items.length >= this.maxQueueSize) {
      return Promise.reject(
        new Error('Stellar submission pool queue is full'),
      );
    }

    return new Promise<PooledSubmitResult>((resolve, reject) => {
      queue.items.push({
        buildOperations: params.buildOperations,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });

      if (queue.items.length >= this.maxBatchSize) {
        this.scheduleFlush(params, 0);
        return;
      }

      if (!queue.timer) {
        this.scheduleFlush(params, this.flushWindowMs);
      }
    });
  }

  async flushSource(sourcePublicKey: string): Promise<void> {
    const queue = this.queues.get(sourcePublicKey);
    if (!queue || queue.inFlight || queue.items.length === 0) {
      return;
    }
    // Flush without submit context is not supported; callers rely on scheduled flush.
  }

  private getOrCreateQueue(sourcePublicKey: string): SourceQueue {
    let queue = this.queues.get(sourcePublicKey);
    if (!queue) {
      queue = { items: [], timer: null, inFlight: false };
      this.queues.set(sourcePublicKey, queue);
    }
    return queue;
  }

  private scheduleFlush(
    params: {
      sourcePublicKey: string;
      sourceKeypair: StellarSdk.Keypair;
      submit: SubmitFn;
    },
    delayMs: number,
  ): void {
    const queue = this.getOrCreateQueue(params.sourcePublicKey);
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = null;
    }

    queue.timer = setTimeout(() => {
      queue.timer = null;
      void this.flush(params);
    }, delayMs);
  }

  private async flush(params: {
    sourcePublicKey: string;
    sourceKeypair: StellarSdk.Keypair;
    submit: SubmitFn;
  }): Promise<void> {
    const queue = this.queues.get(params.sourcePublicKey);
    if (!queue || queue.inFlight || queue.items.length === 0) {
      return;
    }

    queue.inFlight = true;
    const batch = queue.items.splice(0, this.maxBatchSize);

    try {
      const operations = batch.flatMap((item) => item.buildOperations());
      const result = await this.submitBatch(params, operations, batch.length);
      for (const item of batch) {
        item.resolve(result);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      for (const item of batch) {
        item.reject(err);
      }
    } finally {
      queue.inFlight = false;
      if (queue.items.length > 0) {
        this.scheduleFlush(
          params,
          queue.items.length >= this.maxBatchSize ? 0 : this.flushWindowMs,
        );
      } else {
        this.cleanupQueue(params.sourcePublicKey);
      }
    }
  }

  private async submitBatch(
    params: {
      sourcePublicKey: string;
      sourceKeypair: StellarSdk.Keypair;
      submit: SubmitFn;
    },
    operations: StellarSdk.xdr.Operation[],
    batchSize: number,
  ): Promise<PooledSubmitResult> {
    if (operations.length === 0) {
      throw new Error('Cannot submit an empty Stellar batch');
    }

    const build = (account: StellarSdk.Account) => {
      const builder = new StellarSdk.TransactionBuilder(account, {
        fee: (parseInt(this.baseFee, 10) * Math.max(1, operations.length)).toString(),
        networkPassphrase: this.networkPassphrase,
      });
      for (const op of operations) {
        builder.addOperation(op);
      }
      builder.setTimeout(180);
      const tx = builder.build();
      tx.sign(params.sourceKeypair);
      return tx;
    };

    let networkAccount = await this.horizon.loadAccount(params.sourcePublicKey);
    let transaction = build(networkAccount);

    let delayMs = 300;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await params.submit(transaction);
        if (batchSize > 1) {
          this.logger.log(
            `Submitted pooled Stellar batch for ${params.sourcePublicKey} (ops=${operations.length}, attempts=${attempt})`,
          );
        }
        return response;
      } catch (error: any) {
        const sequenceConflict =
          error?.response?.data?.extras?.result_codes?.transaction ===
          'tx_bad_seq';
        const isTransient = isTransientStellarError(error);

        if (sequenceConflict && attempt < 3) {
          this.logger.warn(
            `Pooled submit sequence conflict for ${params.sourcePublicKey}; rebuilding batch (attempt ${attempt})`,
          );
          networkAccount = await this.horizon.loadAccount(params.sourcePublicKey);
          transaction = build(networkAccount);
          continue;
        }

        if (isTransient && attempt < 3) {
          this.logger.warn(
            `Transient pooled submit failure for ${params.sourcePublicKey} (attempt ${attempt}): ${extractStellarErrorMessage(error)}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        throw error;
      }
    }

    throw new Error('Failed to submit pooled Stellar batch after retries');
  }

  private cleanupQueue(sourcePublicKey: string): void {
    const queue = this.queues.get(sourcePublicKey);
    if (queue && !queue.inFlight && queue.items.length === 0 && !queue.timer) {
      this.queues.delete(sourcePublicKey);
    }
  }

  private readBoundedInt(
    raw: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  async onModuleDestroy(): Promise<void> {
    for (const [source, queue] of this.queues.entries()) {
      if (queue.timer) {
        clearTimeout(queue.timer);
        queue.timer = null;
      }
      const err = new Error('Stellar submission pool shutting down');
      for (const item of queue.items.splice(0)) {
        item.reject(err);
      }
      this.queues.delete(source);
    }
  }
}
