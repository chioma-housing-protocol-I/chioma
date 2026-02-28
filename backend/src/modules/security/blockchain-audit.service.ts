import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { AuditLog } from '../audit/entities/audit-log.entity';

export interface AnchorRecord {
  batchId: string;
  logCount: number;
  merkleRoot: string;
  timestamp: string;
  txHash: string | null;
  network: string;
}

/**
 * Blockchain Audit Anchoring Service
 *
 * Creates tamper-evident Merkle-root hashes of audit log batches and
 * anchors them to Stellar as a data-hash memo transaction.  When
 * Stellar is unavailable (test / dev) it records the Merkle root
 * locally so the audit chain is never lost.
 */
@Injectable()
export class BlockchainAuditService {
  private readonly logger = new Logger(BlockchainAuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Anchor the last N un-anchored audit logs to the blockchain.
   * Called on a schedule from AuditRetentionService.
   */
  async anchorAuditBatch(
    batchSize: number = 100,
  ): Promise<AnchorRecord | null> {
    const logs = await this.getUnanchoredLogs(batchSize);
    if (logs.length === 0) {
      this.logger.debug('No un-anchored audit logs to process');
      return null;
    }

    const merkleRoot = this.buildMerkleRoot(logs);
    const batchId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const record: AnchorRecord = {
      batchId,
      logCount: logs.length,
      merkleRoot,
      timestamp,
      txHash: null,
      network: process.env.STELLAR_NETWORK ?? 'testnet',
    };

    // Try to anchor on Stellar; fall back gracefully
    try {
      const txHash = await this.submitToStellar(merkleRoot, batchId);
      record.txHash = txHash;
      this.logger.log(
        `Audit batch anchored on Stellar. batchId=${batchId} txHash=${txHash} logs=${logs.length}`,
      );
    } catch (err) {
      this.logger.warn(
        `Stellar anchoring unavailable – storing Merkle root locally. batchId=${batchId}`,
        err,
      );
    }

    // Mark logs as anchored with the batch metadata
    await this.markLogsAnchored(logs, record);

    return record;
  }

  /**
   * Verify the integrity of a set of audit logs against a stored Merkle root.
   */
  verifyBatch(logs: AuditLog[], storedMerkleRoot: string): boolean {
    const computed = this.buildMerkleRoot(logs);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(storedMerkleRoot, 'hex'),
    );
    if (!isValid) {
      this.logger.warn(
        `Audit log integrity check FAILED. Expected=${storedMerkleRoot} Got=${computed}`,
      );
    }
    return isValid;
  }

  // ─── Merkle tree ─────────────────────────────────────────────────────────────

  private buildMerkleRoot(logs: AuditLog[]): string {
    if (logs.length === 0) return this.sha256('empty');

    let layer = logs.map((log) => this.hashLog(log));

    while (layer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = i + 1 < layer.length ? layer[i + 1] : left; // duplicate last leaf
        nextLayer.push(this.sha256(left + right));
      }
      layer = nextLayer;
    }

    return layer[0];
  }

  private hashLog(log: AuditLog): string {
    const canonical = JSON.stringify({
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      performed_by: log.performed_by,
      performed_at: log.performed_at?.toISOString(),
      status: log.status,
    });
    return this.sha256(canonical);
  }

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // ─── Stellar integration ──────────────────────────────────────────────────

  private async submitToStellar(
    merkleRoot: string,
    _batchId: string,
  ): Promise<string> {
    // Dynamically import to avoid hard dependency at boot
    const {
      Keypair,
      TransactionBuilder,
      Networks,
      Operation,
      Asset,
      Memo,
      BASE_FEE,
    } = await import('@stellar/stellar-sdk');
    const { default: StellarSdk } = await import('@stellar/stellar-sdk');

    const secretKey = process.env.STELLAR_ANCHOR_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STELLAR_ANCHOR_SECRET_KEY not configured');
    }

    const network = process.env.STELLAR_NETWORK ?? 'testnet';
    const horizonUrl =
      network === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org';

    const keypair = Keypair.fromSecret(secretKey);
    const server = new StellarSdk.Horizon.Server(horizonUrl);

    const account = await server.loadAccount(keypair.publicKey());

    // Memo hash must be 32 bytes – use the first 32 bytes of the merkle root
    const memoHash = Buffer.from(merkleRoot, 'hex');

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase:
        network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: keypair.publicKey(), // self-payment of 0.0000001 XLM
          asset: Asset.native(),
          amount: '0.0000001',
        }),
      )
      .addMemo(Memo.hash(memoHash))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await server.submitTransaction(tx);
    return result.hash as string;
  }

  // ─── DB helpers ──────────────────────────────────────────────────────────

  private async getUnanchoredLogs(limit: number): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where("log.metadata IS NULL OR (log.metadata->>'anchored') IS NULL")
      .orderBy('log.performed_at', 'ASC')
      .take(limit)
      .getMany();
  }

  private async markLogsAnchored(
    logs: AuditLog[],
    record: AnchorRecord,
  ): Promise<void> {
    const ids = logs.map((l) => l.id);
    await this.auditLogRepository
      .createQueryBuilder()
      .update(AuditLog)
      .set({
        metadata: () =>
          `COALESCE(metadata, '{}') || '${JSON.stringify({
            anchored: true,
            batchId: record.batchId,
            merkleRoot: record.merkleRoot,
            txHash: record.txHash,
            anchoredAt: record.timestamp,
          })}'`,
      })
      .whereInIds(ids)
      .execute();
  }
}
