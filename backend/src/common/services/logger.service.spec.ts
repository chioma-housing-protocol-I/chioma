import { LoggerService } from './logger.service';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    // Create logger service without DI for testing
    service = new LoggerService(undefined, 'TestContext');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log info messages', () => {
    const logSpy = jest.spyOn(service['logger'], 'info');
    service.log('Test message');
    expect(logSpy).toHaveBeenCalledWith('Test message', expect.any(Object));
  });

  it('should log error messages', () => {
    const errorSpy = jest.spyOn(service['logger'], 'error');
    service.error('Error message', 'Stack trace');
    expect(errorSpy).toHaveBeenCalledWith(
      'Error message',
      expect.objectContaining({
        stack: 'Stack trace',
      }),
    );
  });

  it('should log warn messages', () => {
    const warnSpy = jest.spyOn(service['logger'], 'warn');
    service.warn('Warning message');
    expect(warnSpy).toHaveBeenCalledWith('Warning message', expect.any(Object));
  });

  it('should log debug messages', () => {
    const debugSpy = jest.spyOn(service['logger'], 'debug');
    service.debug('Debug message');
    expect(debugSpy).toHaveBeenCalledWith('Debug message', expect.any(Object));
  });

  it('should set context', () => {
    service.setContext('NewContext');
    const logSpy = jest.spyOn(service['logger'], 'info');
    service.log('Test with context');
    expect(logSpy).toHaveBeenCalledWith(
      'Test with context',
      expect.objectContaining({
        context: 'NewContext',
      }),
    );
  });

  it('should create child logger with context', () => {
    const childLogger = service.child('ChildContext');
    expect(childLogger).toBeInstanceOf(LoggerService);
    expect(childLogger['context']).toBe('ChildContext');
  });

  it('should log with metadata', () => {
    const logSpy = jest.spyOn(service['logger'], 'info');
    service.log('Test message', { userId: 123, action: 'login' });
    expect(logSpy).toHaveBeenCalledWith(
      'Test message',
      expect.objectContaining({
        userId: 123,
        action: 'login',
      }),
    );
  });

  it('should handle verbose logging', () => {
    const verboseSpy = jest.spyOn(service['logger'], 'verbose');
    service.verbose('Verbose message');
    expect(verboseSpy).toHaveBeenCalledWith(
      'Verbose message',
      expect.any(Object),
    );
  });

  it('removes log files older than retention', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chioma-logs-'));
    const oldLog = path.join(tempDir, 'application-2026-01-01.log');
    const freshLog = path.join(tempDir, 'application-2026-05-26.log');

    await fs.writeFile(oldLog, 'old');
    await fs.writeFile(freshLog, 'fresh');

    const oldTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await fs.utimes(oldLog, oldTime, oldTime);

    const removed = await service.cleanupOldLogFiles(tempDir, 1);

    expect(removed).toBe(1);
    await expect(fs.access(oldLog)).rejects.toThrow();
    await expect(fs.access(freshLog)).resolves.not.toThrow();

    await fs.rm(tempDir, { recursive: true, force: true });
  }, 10000);
});
