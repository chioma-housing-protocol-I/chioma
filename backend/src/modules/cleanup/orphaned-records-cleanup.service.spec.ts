import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AlertService } from '../monitoring/alert.service';
import {
  DEFAULT_MAX_DELETIONS_PER_RUN,
  OrphanedRecordsCleanupService,
  SAMPLE_ID_LIMIT,
} from './orphaned-records-cleanup.service';

describe('OrphanedRecordsCleanupService', () => {
  let service: OrphanedRecordsCleanupService;
  let query: jest.Mock;
  let alertService: { handleAlert: jest.Mock };
  let config: Record<string, string>;

  /**
   * Queue of results for successive SELECT queries (one per orphan check);
   * exhausted entries return no orphans. DELETE queries resolve undefined.
   */
  function primeSelects(batches: string[][]): void {
    let selectCall = 0;
    query.mockImplementation((sql: string) => {
      if (sql.trim().startsWith('DELETE')) {
        return Promise.resolve(undefined);
      }
      const ids = batches[selectCall] ?? [];
      selectCall++;
      return Promise.resolve(ids.map((id) => ({ id })));
    });
  }

  function deleteCalls(): unknown[][] {
    return query.mock.calls.filter(([sql]) =>
      String(sql).trim().startsWith('DELETE'),
    );
  }

  beforeEach(async () => {
    query = jest.fn();
    alertService = { handleAlert: jest.fn().mockResolvedValue(undefined) };
    config = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrphanedRecordsCleanupService,
        {
          provide: DataSource,
          useValue: { options: { type: 'postgres' }, query },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: unknown) =>
                config[key] ?? defaultValue,
            ),
          },
        },
        { provide: AlertService, useValue: alertService },
      ],
    }).compile();

    service = module.get(OrphanedRecordsCleanupService);
  });

  describe('dry-run mode', () => {
    it('reports counts and sample ids without mutating', async () => {
      config['ORPHAN_CLEANUP_DELETE_ENABLED'] = 'true';
      primeSelects([['a-1', 'a-2', 'a-3']]);

      const stats = await service.runCleanup({ dryRun: true });

      expect(stats.dryRun).toBe(true);
      expect(stats.totalOrphaned).toBe(3);
      expect(stats.totalDeleted).toBe(0);
      expect(stats.aborted).toBe(false);
      expect(stats.results[0].orphanedCount).toBe(3);
      expect(stats.results[0].sampleIds).toEqual(['a-1', 'a-2', 'a-3']);
      expect(stats.results[0].deleted).toBe(false);
      // No DELETE statement was ever issued.
      expect(deleteCalls()).toHaveLength(0);
    });

    it('caps the sample id list', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => `row-${i}`);
      primeSelects([ids]);

      const stats = await service.runCleanup({ dryRun: true });

      expect(stats.results[0].orphanedCount).toBe(25);
      expect(stats.results[0].sampleIds).toHaveLength(SAMPLE_ID_LIMIT);
    });

    it('can be enabled via configuration', async () => {
      config['ORPHAN_CLEANUP_DELETE_ENABLED'] = 'true';
      config['ORPHAN_CLEANUP_DRY_RUN'] = 'true';
      primeSelects([['a-1']]);

      const stats = await service.runCleanup();

      expect(stats.dryRun).toBe(true);
      expect(deleteCalls()).toHaveLength(0);
    });
  });

  describe('deletion cap', () => {
    it('deletes normally under the cap', async () => {
      config['ORPHAN_CLEANUP_DELETE_ENABLED'] = 'true';
      primeSelects([['a-1', 'a-2'], ['b-1']]);

      const stats = await service.runCleanup();

      expect(stats.totalDeleted).toBe(3);
      expect(stats.aborted).toBe(false);
      expect(stats.maxDeletionsPerRun).toBe(DEFAULT_MAX_DELETIONS_PER_RUN);
      expect(deleteCalls()).toHaveLength(2);
      expect(alertService.handleAlert).not.toHaveBeenCalled();
    });

    it('aborts before a batch that would exceed the cap and raises an alert', async () => {
      config['ORPHAN_CLEANUP_DELETE_ENABLED'] = 'true';
      config['ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN'] = '5';
      primeSelects([
        ['a-1', 'a-2', 'a-3'],
        ['b-1', 'b-2', 'b-3', 'b-4'],
        ['c-1'],
      ]);

      const stats = await service.runCleanup();

      // First batch (3) deleted; second batch (4) would exceed the cap of 5.
      expect(stats.totalDeleted).toBe(3);
      expect(stats.aborted).toBe(true);
      expect(stats.abortReason).toMatch(/cap of 5/);
      expect(deleteCalls()).toHaveLength(1);
      // The run stopped: the third check was never scanned.
      expect(stats.results).toHaveLength(2);

      expect(alertService.handleAlert).toHaveBeenCalledWith({
        alerts: [
          expect.objectContaining({
            status: 'firing',
            labels: expect.objectContaining({
              alertname: 'OrphanCleanupCapExceeded',
              severity: 'critical',
            }),
          }),
        ],
      });
    });

    it('aborts immediately when a single batch alone exceeds the cap', async () => {
      config['ORPHAN_CLEANUP_DELETE_ENABLED'] = 'true';
      config['ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN'] = '10';
      primeSelects([Array.from({ length: 11 }, (_, i) => `x-${i}`)]);

      const stats = await service.runCleanup();

      expect(stats.totalDeleted).toBe(0);
      expect(stats.aborted).toBe(true);
      expect(deleteCalls()).toHaveLength(0);
      expect(alertService.handleAlert).toHaveBeenCalledTimes(1);
    });

    it('falls back to the default cap on invalid configuration', async () => {
      config['ORPHAN_CLEANUP_MAX_DELETIONS_PER_RUN'] = 'not-a-number';
      primeSelects([]);

      const stats = await service.runCleanup();

      expect(stats.maxDeletionsPerRun).toBe(DEFAULT_MAX_DELETIONS_PER_RUN);
    });
  });

  describe('scan-only default', () => {
    it('counts orphans without deleting when deletion is not enabled', async () => {
      primeSelects([['a-1', 'a-2']]);

      const stats = await service.runCleanup();

      expect(stats.dryRun).toBe(false);
      expect(stats.deletionEnabled).toBe(false);
      expect(stats.totalOrphaned).toBe(2);
      expect(stats.totalDeleted).toBe(0);
      expect(deleteCalls()).toHaveLength(0);
    });
  });

  it('skips entirely on non-postgres databases', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrphanedRecordsCleanupService,
        {
          provide: DataSource,
          useValue: { options: { type: 'sqlite' }, query },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k, d) => d) },
        },
        { provide: AlertService, useValue: alertService },
      ],
    }).compile();

    const sqliteService = module.get(OrphanedRecordsCleanupService);
    const stats = await sqliteService.runCleanup();

    expect(stats.results).toHaveLength(0);
    expect(query).not.toHaveBeenCalled();
  });
});
