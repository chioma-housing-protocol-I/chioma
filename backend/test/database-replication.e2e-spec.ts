import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { QueryRunner } from 'typeorm';
import {
  createDatabaseConnectionOptions,
  hasReplicaDatabaseConfig,
} from '../src/database/database-config';
import { MetricsService } from '../src/modules/monitoring/metrics.service';
import { DatabaseReplicationService } from '../src/modules/monitoring/database-replication.service';

const makeQueryRunner = (queryImplementation?: jest.Mock): QueryRunner =>
  ({
    connect: jest.fn().mockResolvedValue(undefined),
    query: queryImplementation ?? jest.fn().mockResolvedValue([]),
    release: jest.fn().mockResolvedValue(undefined),
  }) as unknown as QueryRunner;

describe('Database Replication Integration (e2e)', () => {
  const originalEnv = { ...process.env };

  let module: TestingModule;
  let service: DatabaseReplicationService;
  let metricsService: MetricsService;
  let mockDataSource: {
    query: jest.Mock;
    createQueryRunner: jest.Mock;
  };

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      DB_HOST: 'primary-db',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres-secret',
      DB_NAME: 'chioma',
      DB_REPLICA_HOST: 'replica-db',
      DB_REPLICA_PORT: '5432',
      DB_REPLICA_USERNAME: 'replica-user',
      DB_REPLICA_PASSWORD: 'replica-secret',
      DB_REPLICA_NAME: 'chioma',
      DB_REPLICATION_MAX_LAG_SECONDS: '10',
    };

    mockDataSource = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        MetricsService,
        DatabaseReplicationService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get(DatabaseReplicationService);
    metricsService = module.get(MetricsService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    if (module) {
      await module.close();
    }
  });

  describe('Replication setup', () => {
    it('builds replication-aware TypeORM options when replica env vars are present', () => {
      const options = createDatabaseConnectionOptions(
        '/virtual/backend/src',
        ['/virtual/backend/src/migrations/*.ts'],
        process.env,
      );

      expect(hasReplicaDatabaseConfig(process.env)).toBe(true);
      expect(options).toHaveProperty('replication');
      expect(options).toMatchObject({
        replication: {
          master: {
            host: 'primary-db',
            port: 5432,
            username: 'postgres',
            database: 'chioma',
          },
          slaves: [
            {
              host: 'replica-db',
              port: 5432,
              username: 'replica-user',
              database: 'chioma',
            },
          ],
        },
      });
    });

    it('falls back to the standard primary connection config when replica env vars are absent', () => {
      delete process.env.DB_REPLICA_HOST;
      delete process.env.DB_REPLICA_PORT;
      delete process.env.DB_REPLICA_USERNAME;
      delete process.env.DB_REPLICA_PASSWORD;
      delete process.env.DB_REPLICA_NAME;

      const options = createDatabaseConnectionOptions(
        '/virtual/backend/src',
        ['/virtual/backend/src/migrations/*.ts'],
        process.env,
      );

      expect(hasReplicaDatabaseConfig(process.env)).toBe(false);
      expect(options).not.toHaveProperty('replication');
      expect(options).toMatchObject({
        host: 'primary-db',
        port: 5432,
        username: 'postgres',
        database: 'chioma',
      });
    });
  });

  describe('Replication monitoring and failover', () => {
    it('captures streaming replica metrics and reports failover readiness', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ primary_writable: true }])
        .mockResolvedValueOnce([
          {
            replica: 'replica-db',
            state: 'streaming',
            sync_state: 'async',
            lag_bytes: 128,
            replay_lag_seconds: 0.5,
          },
        ]);

      const snapshot = await service.getReplicationStatus();
      const metrics = await metricsService.getMetrics();

      expect(snapshot.replicationConfigured).toBe(true);
      expect(snapshot.primaryWritable).toBe(true);
      expect(snapshot.failoverReady).toBe(true);
      expect(snapshot.healthyReplicaCount).toBe(1);
      expect(snapshot.replicas).toEqual([
        {
          replica: 'replica-db',
          state: 'streaming',
          syncState: 'async',
          lagBytes: 128,
          lagSeconds: 0.5,
          healthy: true,
        },
      ]);
      expect(metrics).toContain('database_replication_lag_seconds');
      expect(metrics).toContain('replica="replica-db"');
      expect(metrics).toContain('database_replica_count');
    });

    it('marks failover as not ready when the replica is unhealthy or lagging', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ primary_writable: true }])
        .mockResolvedValueOnce([
          {
            replica: 'replica-db',
            state: 'startup',
            sync_state: 'async',
            lag_bytes: 4096,
            replay_lag_seconds: 12,
          },
        ]);

      const snapshot = await service.getReplicationStatus();

      expect(snapshot.failoverReady).toBe(false);
      expect(snapshot.healthyReplicaCount).toBe(0);
      expect(snapshot.replicas[0]).toMatchObject({
        replica: 'replica-db',
        healthy: false,
        lagSeconds: 12,
      });
    });

    it('returns a disabled snapshot when replication is not configured', async () => {
      delete process.env.DB_REPLICA_HOST;
      delete process.env.DB_REPLICA_PORT;
      delete process.env.DB_REPLICA_USERNAME;
      delete process.env.DB_REPLICA_PASSWORD;
      delete process.env.DB_REPLICA_NAME;

      const snapshot = await service.getReplicationStatus();

      expect(snapshot).toMatchObject({
        replicationConfigured: false,
        primaryWritable: false,
        failoverReady: false,
        healthyReplicaCount: 0,
        replicas: [],
      });
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('Consistency verification', () => {
    it('verifies primary and replica return consistent data and releases both runners', async () => {
      const primaryRunner = makeQueryRunner(
        jest.fn().mockResolvedValue([{ id: 1, status: 'open' }]),
      );
      const replicaRunner = makeQueryRunner(
        jest.fn().mockResolvedValue([{ status: 'open', id: 1 }]),
      );
      mockDataSource.createQueryRunner
        .mockReturnValueOnce(primaryRunner)
        .mockReturnValueOnce(replicaRunner);

      const result = await service.verifyReplicaConsistency(
        'SELECT id, status FROM disputes ORDER BY id',
      );

      expect(mockDataSource.createQueryRunner).toHaveBeenNthCalledWith(
        1,
        'master',
      );
      expect(mockDataSource.createQueryRunner).toHaveBeenNthCalledWith(
        2,
        'slave',
      );
      expect(result.matched).toBe(true);
      expect(primaryRunner.connect).toHaveBeenCalledTimes(1);
      expect(replicaRunner.connect).toHaveBeenCalledTimes(1);
      expect(primaryRunner.release).toHaveBeenCalledTimes(1);
      expect(replicaRunner.release).toHaveBeenCalledTimes(1);
    });

    it('detects data divergence between primary and replica results', async () => {
      const primaryRunner = makeQueryRunner(
        jest.fn().mockResolvedValue([{ id: 1, status: 'resolved' }]),
      );
      const replicaRunner = makeQueryRunner(
        jest.fn().mockResolvedValue([{ id: 1, status: 'open' }]),
      );
      mockDataSource.createQueryRunner
        .mockReturnValueOnce(primaryRunner)
        .mockReturnValueOnce(replicaRunner);

      const result = await service.verifyReplicaConsistency(
        'SELECT id, status FROM disputes ORDER BY id',
      );

      expect(result.matched).toBe(false);
      expect(result.primaryRows).toEqual([{ id: 1, status: 'resolved' }]);
      expect(result.replicaRows).toEqual([{ id: 1, status: 'open' }]);
    });
  });

  describe('Recovery procedures', () => {
    it('reports recovery status for the replica and cleans up the query runner', async () => {
      const replicaRunner = makeQueryRunner(
        jest.fn().mockResolvedValue([
          {
            replica: '10.0.0.22',
            in_recovery: true,
            replay_paused: false,
          },
        ]),
      );
      mockDataSource.createQueryRunner.mockReturnValue(replicaRunner);

      const recovery = await service.getRecoveryStatus();

      expect(recovery).toEqual([
        {
          replica: '10.0.0.22',
          inRecovery: true,
          replayPaused: false,
        },
      ]);
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledWith('slave');
      expect(replicaRunner.connect).toHaveBeenCalledTimes(1);
      expect(replicaRunner.release).toHaveBeenCalledTimes(1);
    });
  });
});
