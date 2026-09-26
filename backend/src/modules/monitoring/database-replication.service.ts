import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { hasReplicaDatabaseConfig } from '../../database/database-config';
import { MetricsService } from './metrics.service';

export interface ReplicaMetrics {
  replica: string;
  state: string;
  syncState: string;
  lagBytes: number;
  lagSeconds: number;
  healthy: boolean;
}

export interface DatabaseReplicationSnapshot {
  timestamp: Date;
  replicationConfigured: boolean;
  primaryWritable: boolean;
  failoverReady: boolean;
  healthyReplicaCount: number;
  replicas: ReplicaMetrics[];
}

export interface ReplicaConsistencyResult {
  query: string;
  matched: boolean;
  primaryRows: unknown[];
  replicaRows: unknown[];
}

export interface ReplicaRecoveryStatus {
  replica: string;
  inRecovery: boolean;
  replayPaused: boolean;
}

@Injectable()
export class DatabaseReplicationService {
  private readonly logger = new Logger(DatabaseReplicationService.name);
  private readonly maxLagSeconds = Number.parseInt(
    process.env.DB_REPLICATION_MAX_LAG_SECONDS ?? '10',
    10,
  );

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
  ) {}

  isReplicationConfigured(
    env: Record<string, string | undefined> = process.env,
  ) {
    return hasReplicaDatabaseConfig(env);
  }

  async getReplicationStatus(): Promise<DatabaseReplicationSnapshot> {
    if (!this.isReplicationConfigured()) {
      return {
        timestamp: new Date(),
        replicationConfigured: false,
        primaryWritable: false,
        failoverReady: false,
        healthyReplicaCount: 0,
        replicas: [],
      };
    }

    const [primaryResult] = await this.dataSource.query(`
      SELECT NOT pg_is_in_recovery() AS primary_writable
    `);

    const rows = await this.dataSource.query(`
      SELECT
        COALESCE(application_name, client_addr::text, 'replica') AS replica,
        state,
        sync_state,
        COALESCE(pg_wal_lsn_diff(sent_lsn, replay_lsn), 0)::bigint AS lag_bytes,
        COALESCE(EXTRACT(EPOCH FROM replay_lag), 0)::float AS replay_lag_seconds
      FROM pg_stat_replication
    `);

    const replicas = rows.map((row: Record<string, unknown>) =>
      this.toReplicaMetrics(row),
    );

    for (const replica of replicas) {
      this.metricsService.setReplicationLag(
        replica.replica,
        replica.lagSeconds,
      );
      this.metricsService.setReplicaHealth(replica.replica, replica.healthy);
    }
    this.metricsService.setReplicaCount(replicas.length);

    const primaryWritable = Boolean(primaryResult?.primary_writable);
    const healthyReplicaCount = replicas.filter(
      (replica) => replica.healthy,
    ).length;

    return {
      timestamp: new Date(),
      replicationConfigured: true,
      primaryWritable,
      failoverReady: primaryWritable && healthyReplicaCount > 0,
      healthyReplicaCount,
      replicas,
    };
  }

  async verifyReplicaConsistency(
    query: string,
    parameters: unknown[] = [],
  ): Promise<ReplicaConsistencyResult> {
    if (!this.isReplicationConfigured()) {
      throw new Error('Replication is not configured');
    }

    const primaryRunner = this.dataSource.createQueryRunner('master');
    const replicaRunner = this.dataSource.createQueryRunner('slave');

    await Promise.all([primaryRunner.connect(), replicaRunner.connect()]);

    try {
      const [primaryRows, replicaRows] = await Promise.all([
        primaryRunner.query(query, parameters),
        replicaRunner.query(query, parameters),
      ]);

      return {
        query,
        matched:
          this.serializeForComparison(primaryRows) ===
          this.serializeForComparison(replicaRows),
        primaryRows,
        replicaRows,
      };
    } finally {
      await this.releaseRunners(primaryRunner, replicaRunner);
    }
  }

  async getRecoveryStatus(): Promise<ReplicaRecoveryStatus[]> {
    if (!this.isReplicationConfigured()) {
      return [];
    }

    const replicaRunner = this.dataSource.createQueryRunner('slave');
    await replicaRunner.connect();

    try {
      const rows = await replicaRunner.query(`
        SELECT
          COALESCE(inet_server_addr()::text, 'replica') AS replica,
          pg_is_in_recovery() AS in_recovery,
          pg_is_wal_replay_paused() AS replay_paused
      `);

      return rows.map((row: Record<string, unknown>) => ({
        replica: typeof row.replica === 'string' ? row.replica : 'replica',
        inRecovery: Boolean(row.in_recovery),
        replayPaused: Boolean(row.replay_paused),
      }));
    } finally {
      await this.releaseRunners(replicaRunner);
    }
  }

  private toReplicaMetrics(row: Record<string, unknown>): ReplicaMetrics {
    const replica = typeof row.replica === 'string' ? row.replica : 'replica';
    const state = typeof row.state === 'string' ? row.state : 'unknown';
    const lagSeconds = Number(row.replay_lag_seconds ?? 0);
    const lagBytes = Number(row.lag_bytes ?? 0);
    const healthy = state === 'streaming' && lagSeconds <= this.maxLagSeconds;

    if (!healthy) {
      this.logger.warn(
        `Replica ${replica} is unhealthy: state=${state}, lag=${lagSeconds}s`,
      );
    }

    return {
      replica,
      state,
      syncState:
        typeof row.sync_state === 'string' ? row.sync_state : 'unknown',
      lagBytes,
      lagSeconds,
      healthy,
    };
  }

  private async releaseRunners(...runners: QueryRunner[]): Promise<void> {
    await Promise.allSettled(runners.map((runner) => runner.release()));
  }

  private serializeForComparison(value: unknown): string {
    const normalize = (input: unknown): unknown => {
      if (Array.isArray(input)) {
        return input.map((entry) => normalize(entry));
      }

      if (input && typeof input === 'object') {
        return Object.keys(input as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = normalize((input as Record<string, unknown>)[key]);
            return acc;
          }, {});
      }

      return input;
    };

    return JSON.stringify(normalize(value));
  }
}
