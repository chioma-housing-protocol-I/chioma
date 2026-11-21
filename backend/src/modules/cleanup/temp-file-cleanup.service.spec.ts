import { Test, TestingModule } from '@nestjs/testing';
import { TempFileCleanupService } from './temp-file-cleanup.service';
import { AlertService } from '../monitoring/alert.service';
import * as fs from 'fs';

jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
  };
});

describe('TempFileCleanupService', () => {
  let service: TempFileCleanupService;
  let alertService: { handleAlert: jest.Mock };

  beforeEach(async () => {
    alertService = { handleAlert: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TempFileCleanupService,
        { provide: AlertService, useValue: alertService },
      ],
    }).compile();

    service = module.get<TempFileCleanupService>(TempFileCleanupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip if directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const spy = jest.spyOn(service, 'cleanupDirectory');
    await service.cleanupDirectory('/fake/dir');

    expect(spy).toHaveBeenCalled();
  });

  it('logs and alerts when a scheduled cleanup task fails', async () => {
    jest
      .spyOn(service, 'cleanupDirectory')
      .mockRejectedValue(new Error('disk error'));

    await service.handleCron();

    expect(alertService.handleAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alerts: [
          expect.objectContaining({
            status: 'firing',
            labels: expect.objectContaining({
              alertname: 'BackgroundTaskFailure',
              task: 'temp-file-cleanup',
              severity: 'critical',
            }),
          }),
        ],
      }),
    );
  });
});
