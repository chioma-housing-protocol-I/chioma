import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../logger.service';
import { LogLevel } from '../logger.interfaces';
import { RequestContext } from '../request-context';
import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs');

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should format logs as JSON in production', () => {
    process.env.NODE_ENV = 'production';
    service.setContext('TestService');
    service.info('test message', { foo: 'bar' });

    expect(console.log).toHaveBeenCalled();
    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.level).toBe(LogLevel.INFO);
    expect(parsed.message).toBe('test message');
    expect(parsed.service).toBe('TestService');
    expect(parsed.context).toEqual({ foo: 'bar' });
    expect(parsed.timestamp).toBeDefined();

    delete process.env.NODE_ENV;
  });

  it('should include RequestContext IDs in logs', () => {
    process.env.NODE_ENV = 'production';
    RequestContext.run(
      { correlationId: 'corr-123', requestId: 'req-456' },
      () => {
        service.info('context test');
      },
    );

    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed.correlationId).toBe('corr-123');
    expect(parsed.requestId).toBe('req-456');

    delete process.env.NODE_ENV;
  });

  it('should forward errors to Sentry', () => {
    const error = new Error('test error');
    service.error('oops', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(console.error).toHaveBeenCalled();
  });

  it('should forward fatal errors to Sentry', () => {
    const error = new Error('fatal error');
    service.fatal('critical', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(console.error).toHaveBeenCalled();
  });
});
