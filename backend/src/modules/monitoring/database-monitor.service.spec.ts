import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AlertPayload } from './alert.types';
import { AlertService } from './alert.service';
import { DatabaseMonitorService } from './database-monitor.service';
import { MetricsService } from './metrics.service';
import { PerformanceMonitorService } from './performance-monitor.service';

interface DriverPoolStub {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  options?: { max?: number };
}

function makeQueryMock() {
  return jest.fn((sql: string) => {
    if (sql.includes('pg_stat_activity')) {
      return Promise.resolve([{ total: 5, active: 2, idle: 3, waiting: 0 }]);
    }
    if (sql.includes('max_connections')) {
      return Promise.resolve([{ max_conn: 100 }]);
    }
    if (sql.includes('pg_database_size')) {
      return Promise.resolve([{ size_bytes: 1000, size_human: '1000 bytes' }]);
    }
    if (sql.includes('information_schema.tables')) {
      return Promise.resolve([
        { table_count: 1, index_count: 1, index_size_bytes: 0 },
      ]);
    }
    if (sql.includes('pg_stat_statements')) {
      return Promise.resolve([{ total_calls: 0, avg_time: 0, max_time: 0 }]);
    }
    if (sql.includes('pg_stat_database')) {
      return Promise.resolve([{ cache_hit_ratio: 100 }]);
    }
    return Promise.resolve([]);
  });
}

function makeDataSource(driverPool?: DriverPoolStub): Partial<DataSource> {
  return {
    query: makeQueryMock() as unknown as DataSource['query'],
    driver: (driverPool ? { master: driverPool } : {}) as DataSource['driver'],
  };
}

describe('DatabaseMonitorService', () => {
  let service: DatabaseMonitorService;
  let metricsService: jest.Mocked<Pick<MetricsService, 'setDatabasePoolUsage'>>;
  let alertService: jest.Mocked<Pick<AlertService, 'handleAlert'>>;

  async function build(driverPool?: DriverPoolStub) {
    metricsService = { setDatabasePoolUsage: jest.fn() };
    alertService = { handleAlert: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseMonitorService,
        { provide: getDataSourceToken(), useValue: makeDataSource(driverPool) },
        { provide: MetricsService, useValue: metricsService },
        { provide: AlertService, useValue: alertService },
        { provide: PerformanceMonitorService, useValue: {} },
      ],
    }).compile();

    service = module.get(DatabaseMonitorService);
  }

  function firedAlertNames(): string[] {
    return alertService.handleAlert.mock.calls.flatMap((call) =>
      (call[0].alerts as AlertPayload[]).map((a) => a.labels.alertname),
    );
  }

  describe('application connection pool metrics', () => {
    it('reads live stats off the underlying pg.Pool and publishes them via MetricsService', async () => {
      await build({
        totalCount: 8,
        idleCount: 3,
        waitingCount: 1,
        options: { max: 20 },
      });

      const metrics = await service.getPoolMetrics();

      expect(metrics?.applicationPool).toEqual({
        total: 8,
        idle: 3,
        waiting: 1,
        max: 20,
        utilizationPercent: 25, // (8 - 3) / 20 * 100
      });
      expect(metricsService.setDatabasePoolUsage).toHaveBeenCalledWith(
        5,
        3,
        20,
        1,
      );
    });

    it('returns a null applicationPool and skips the gauge update when the driver pool is unavailable', async () => {
      await build(undefined);

      const metrics = await service.getPoolMetrics();

      expect(metrics?.applicationPool).toBeNull();
      expect(metricsService.setDatabasePoolUsage).not.toHaveBeenCalled();
    });
  });

  describe('application connection pool alerting', () => {
    it('fires a critical exhaustion alert when requests are queued waiting for a connection', async () => {
      await build({
        totalCount: 20,
        idleCount: 0,
        waitingCount: 4,
        options: { max: 20 },
      });

      await service.performDatabaseHealthCheck();

      expect(firedAlertNames()).toContain(
        'database_application_pool_exhausted',
      );
    });

    it('fires a critical utilization alert at >=90% usage with nothing queued', async () => {
      await build({
        totalCount: 19,
        idleCount: 0,
        waitingCount: 0,
        options: { max: 20 },
      });

      await service.performDatabaseHealthCheck();

      const names = firedAlertNames();
      expect(names).toContain('database_application_pool_critical');
      expect(names).not.toContain('database_application_pool_exhausted');
    });

    it('fires a warning alert at >=70% usage', async () => {
      await build({
        totalCount: 15,
        idleCount: 0,
        waitingCount: 0,
        options: { max: 20 },
      });

      await service.performDatabaseHealthCheck();

      expect(firedAlertNames()).toContain('database_application_pool_warning');
    });

    it('fires no application pool alert when usage is healthy', async () => {
      await build({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
        options: { max: 20 },
      });

      await service.performDatabaseHealthCheck();

      expect(firedAlertNames()).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^database_application_pool/),
        ]),
      );
    });
  });
});
