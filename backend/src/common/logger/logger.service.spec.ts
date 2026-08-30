import {
  ConsoleTransport,
  FileTransport,
  LoggerService,
  SentryTransport,
  resolveTransports,
} from './logger.service';

describe('resolveTransports', () => {
  it('defaults to console only in development', () => {
    const transports = resolveTransports({ NODE_ENV: 'development' });
    expect(transports).toHaveLength(1);
    expect(transports[0]).toBeInstanceOf(ConsoleTransport);
  });

  it('defaults to console + sentry in production when SENTRY_DSN is set', () => {
    const transports = resolveTransports({
      NODE_ENV: 'production',
      SENTRY_DSN: 'https://example@sentry.io/1',
    });
    expect(transports).toHaveLength(2);
    expect(transports[0]).toBeInstanceOf(ConsoleTransport);
    expect(transports[1]).toBeInstanceOf(SentryTransport);
  });

  it('omits sentry in production when SENTRY_DSN is unset, falling back to console', () => {
    const transports = resolveTransports({ NODE_ENV: 'production' });
    expect(transports).toHaveLength(1);
    expect(transports[0]).toBeInstanceOf(ConsoleTransport);
  });

  it('is configuration-driven via LOG_TRANSPORT', () => {
    const transports = resolveTransports({
      NODE_ENV: 'development',
      LOG_TRANSPORT: 'file,console',
      LOG_FILE: '/tmp/app.log',
    });
    expect(transports).toHaveLength(2);
    expect(transports[0]).toBeInstanceOf(FileTransport);
    expect(transports[1]).toBeInstanceOf(ConsoleTransport);
  });

  it('ignores unknown transport names', () => {
    const transports = resolveTransports({
      NODE_ENV: 'development',
      LOG_TRANSPORT: 'bogus',
    });
    expect(transports).toHaveLength(1);
    expect(transports[0]).toBeInstanceOf(ConsoleTransport);
  });
});

describe('LoggerService', () => {
  it('writes each log entry to every configured transport', () => {
    const service = new LoggerService();
    const writeSpy = jest
      .spyOn(ConsoleTransport.prototype, 'write')
      .mockImplementation(() => undefined);

    service.info('hello', { service: 'test' });

    expect(writeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'INFO', message: 'hello' }),
    );
    writeSpy.mockRestore();
  });
});
