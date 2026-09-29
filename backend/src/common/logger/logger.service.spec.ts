import { context, trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
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

  describe('trace/span correlation (#1547)', () => {
    let provider: NodeTracerProvider;

    beforeEach(() => {
      provider = new NodeTracerProvider();
      provider.register();
    });

    afterEach(async () => {
      await provider.shutdown();
      trace.disable();
      context.disable();
    });

    it('stamps traceId/spanId from the active span onto shipped log entries', () => {
      const service = new LoggerService();
      const writeSpy = jest
        .spyOn(ConsoleTransport.prototype, 'write')
        .mockImplementation(() => undefined);

      const tracer = trace.getTracer('test');
      const span = tracer.startSpan('test-span');
      const spanContext = span.spanContext();

      context.with(trace.setSpan(context.active(), span), () => {
        service.info('inside a span', { service: 'test' });
      });
      span.end();

      expect(writeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        }),
      );
      writeSpy.mockRestore();
    });

    it('leaves traceId/spanId undefined when there is no active span', () => {
      const service = new LoggerService();
      const writeSpy = jest
        .spyOn(ConsoleTransport.prototype, 'write')
        .mockImplementation(() => undefined);

      service.info('outside any span', { service: 'test' });

      expect(writeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: undefined, spanId: undefined }),
      );
      writeSpy.mockRestore();
    });

    it('an explicitly passed traceId in context overrides the active span', () => {
      const service = new LoggerService();
      const writeSpy = jest
        .spyOn(ConsoleTransport.prototype, 'write')
        .mockImplementation(() => undefined);

      const tracer = trace.getTracer('test');
      const span = tracer.startSpan('test-span');

      context.with(trace.setSpan(context.active(), span), () => {
        service.info('override', { traceId: 'explicit-trace-id' });
      });
      span.end();

      expect(writeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'explicit-trace-id' }),
      );
      writeSpy.mockRestore();
    });
  });
});
