import { LoggerService } from './logger.service';

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
});
