import { DataSource } from 'typeorm';
import { DatabaseMaintenanceService } from './database-maintenance.service';

describe('DatabaseMaintenanceService', () => {
  it('skips vacuum for non-postgres databases', async () => {
    const dataSource = {
      options: { type: 'sqlite' },
      query: jest.fn(),
    } as unknown as DataSource;
    const service = new DatabaseMaintenanceService(dataSource);

    const stats = await service.runMaintenance();

    expect(stats.vacuumAnalyzeRan).toBe(false);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('runs vacuum analyze for postgres databases', async () => {
    const dataSource = {
      options: { type: 'postgres' },
      query: jest
        .fn()
        .mockResolvedValueOnce([{ tableName: 'users', deadTuples: '1200' }])
        .mockResolvedValueOnce(undefined),
    } as unknown as DataSource;
    const service = new DatabaseMaintenanceService(dataSource);

    const stats = await service.runMaintenance();

    expect(stats.vacuumAnalyzeRan).toBe(true);
    expect(stats.tablesNeedingVacuum).toBe(1);
    expect(dataSource.query).toHaveBeenLastCalledWith('VACUUM (ANALYZE)');
  });
});
