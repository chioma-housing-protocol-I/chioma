import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LoggerService } from '@/lib/logger';

describe('Frontend Logger Service', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('exports Logger and LoggerService aliases', () => {
    expect(Logger).toBeDefined();
    expect(LoggerService).toBe(Logger);
  });

  it('logs messages in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    Logger.log('Test log message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('[INFO] Test log message');
  });

  it('suppresses log/info/debug messages in production', () => {
    process.env.NODE_ENV = 'production';
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    Logger.log('Production log message');
    Logger.info('Production info message');
    Logger.debug('Production debug message');

    expect(logSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('logs warnings across all environments', () => {
    process.env.NODE_ENV = 'production';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    Logger.warn('Warning condition encountered');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('[WARN] Warning condition encountered');
  });

  it('logs errors and notifies error reporter if present', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reporterMock = vi.fn();
    window.__CHIOMA_ERROR_REPORTER__ = reporterMock;

    const error = new Error('Test exception');
    Logger.error('Operation failed', error);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('[ERROR] Operation failed');
    expect(reporterMock).toHaveBeenCalledTimes(1);
    expect(reporterMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Error',
        message: 'Operation failed: Test exception',
        stack: error.stack,
      }),
    );

    delete window.__CHIOMA_ERROR_REPORTER__;
  });

  it('supports child loggers with context', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const childLogger = Logger.createChild('BackgroundSync');
    childLogger.log('Child logger message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('[BackgroundSync] Child logger message');
  });

  it('supports instantiated loggers with context', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const customLogger = new Logger('CustomContext');
    customLogger.log('Custom message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('[CustomContext] Custom message');
  });
});
