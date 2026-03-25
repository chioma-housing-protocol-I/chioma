import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../logger.service';
import { LogLevel } from '../logger.interfaces';
import { RequestContext } from '../request-context';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs');

describe('LoggerService', () => {
  let service: LoggerService;

  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'NODE_ENV') return process.env.NODE_ENV || 'development';
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should format logs as JSON in production', () => {
    process.env.NODE_ENV = 'production';
    service = new LoggerService(configService);
    const logSpy = jest.spyOn(service['logger'], 'log');

    service.setContext('TestService');
    service.info('test message', { foo: 'bar' });

    expect(logSpy).toHaveBeenCalled();
    const [_level, _message, entry] = (logSpy as jest.Mock).mock.calls[0];

    expect(_level).toBe('info');
    expect(_message).toBe('test message');
    expect(entry.service).toBe('TestService');
    expect(entry.context).toEqual({ foo: 'bar' });
    expect(entry.timestamp).toBeDefined();

    delete process.env.NODE_ENV;
  });

  it('should include RequestContext IDs in logs', () => {
    process.env.NODE_ENV = 'production';
    service = new LoggerService(configService);
    const logSpy = jest.spyOn(service['logger'], 'log');

    RequestContext.run(
      { correlationId: 'corr-123', requestId: 'req-456' },
      () => {
        service.info('context test');
      },
    );

    const [, , entry] = (logSpy as jest.Mock).mock.calls[0];

    expect(entry.correlationId).toBe('corr-123');
    expect(entry.requestId).toBe('req-456');

    delete process.env.NODE_ENV;
  });

  it('should forward errors to Sentry', () => {
    const error = new Error('test error');
    const logSpy = jest.spyOn(service['logger'], 'log');
    service.error('oops', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(logSpy).toHaveBeenCalledWith('error', 'oops', expect.anything());
  });

  it('should forward fatal errors to Sentry', () => {
    const error = new Error('fatal error');
    const logSpy = jest.spyOn(service['logger'], 'log');
    service.fatal('critical', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(logSpy).toHaveBeenCalledWith('error', 'critical', expect.anything());
  });
});
