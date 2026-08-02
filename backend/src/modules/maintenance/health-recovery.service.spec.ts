import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthRecoveryService } from './health-recovery.service';
import { DatabaseHealthIndicator } from '../../health/indicators/database.indicator';

describe('HealthRecoveryService - database connection recovery', () => {
  let service: HealthRecoveryService;
  let databaseHealthIndicator: jest.Mocked<DatabaseHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {};
    const mockDatabaseHealthIndicator = {
      checkConnection: jest.fn(),
      reconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthRecoveryService,
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        {
          provide: DatabaseHealthIndicator,
          useValue: mockDatabaseHealthIndicator,
        },
      ],
    }).compile();

    service = module.get<HealthRecoveryService>(HealthRecoveryService);
    databaseHealthIndicator = module.get(DatabaseHealthIndicator);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    // Register strategies without starting the real 60s healing interval.
    service.onModuleInit();
    service.onModuleDestroy();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips reconnect when the database connection is healthy', async () => {
    databaseHealthIndicator.checkConnection.mockResolvedValue(true);

    await service.heal('reconnect-if-db-stale');

    expect(databaseHealthIndicator.reconnect).not.toHaveBeenCalled();
  });

  it('reconnects when the database connection is down', async () => {
    databaseHealthIndicator.checkConnection.mockResolvedValue(false);
    databaseHealthIndicator.reconnect.mockResolvedValue(true);

    await service.heal('reconnect-if-db-stale');

    expect(databaseHealthIndicator.reconnect).toHaveBeenCalled();
  });

  it('logs an error but does not throw when reconnect attempt fails', async () => {
    databaseHealthIndicator.checkConnection.mockResolvedValue(false);
    databaseHealthIndicator.reconnect.mockResolvedValue(false);

    await expect(service.heal('reconnect-if-db-stale')).resolves.not.toThrow();
    expect(databaseHealthIndicator.reconnect).toHaveBeenCalled();
  });
});
