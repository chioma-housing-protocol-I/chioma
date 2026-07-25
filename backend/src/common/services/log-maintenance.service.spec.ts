import { LogMaintenanceService } from './log-maintenance.service';
import { LoggerService } from './logger.service';

describe('LogMaintenanceService', () => {
  it('runs old log file cleanup', async () => {
    const loggerService = {
      cleanupOldLogFiles: jest.fn().mockResolvedValue(1),
    } as unknown as LoggerService;
    const service = new LogMaintenanceService(loggerService);

    await service.cleanupOldLogs();

    expect(loggerService.cleanupOldLogFiles).toHaveBeenCalled();
  });
});
