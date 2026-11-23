import {
  LoggerMiddleware,
  sanitizeBody,
  sanitizeResponseBody,
} from '../middleware/logger.middleware';
import { Request, Response } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    middleware = new LoggerMiddleware(mockLogger as any);
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('redacts sensitive fields in request body', () => {
    const input = {
      email: 'test@example.com',
      password: 'secret123',
      token: 'abc123',
      nested: {
        secret: 'hidden',
        name: 'john',
      },
    };

    const result = sanitizeBody(input);

    expect(result).toEqual({
      email: 'test@example.com',
      password: '[REDACTED]',
      token: '[REDACTED]',
      nested: {
        secret: '[REDACTED]',
        name: 'john',
      },
    });
  });

  it('logs ERROR level for 5xx responses', () => {
    const req = {
      method: 'GET',
      originalUrl: '/test-error',
      path: '/test-error',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      statusCode: 500,
      getHeader: jest.fn().mockReturnValue('10'),
      getHeaders: jest.fn().mockReturnValue({}),
      setHeader: jest.fn(),
      on: (event: string, cb: () => void) => {
        if (event === 'finish') cb();
      },
      locals: {},
    } as unknown as Response;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'GET /test-error',
      expect.objectContaining({
        http: expect.objectContaining({
          level: 'ERROR',
          statusCode: 500,
        }),
      }),
      'HTTP',
    );
  });

  it('skips logging for /health endpoint', () => {
    const req = {
      path: '/health',
    } as Request;

    const res = {} as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockLogger.log).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('logs method, path, status code and response time for successful requests', () => {
    const req = {
      method: 'GET',
      originalUrl: '/test-ok',
      path: '/test-ok',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = {
      statusCode: 200,
      getHeader: jest.fn().mockReturnValue('10'),
      getHeaders: jest.fn().mockReturnValue({}),
      setHeader: jest.fn(),
      on: (event: string, cb: () => void) => {
        if (event === 'finish') cb();
      },
      locals: {},
    } as unknown as Response;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockLogger.log).toHaveBeenCalledWith(
      'GET /test-ok',
      expect.objectContaining({
        http: expect.objectContaining({
          method: 'GET',
          url: '/test-ok',
          statusCode: 200,
          responseTime: expect.any(Number),
        }),
      }),
      'HTTP',
    );
  });

  it('reuses an incoming x-request-id header as the correlation ID', () => {
    const req = {
      method: 'GET',
      originalUrl: '/test-correlation',
      path: '/test-correlation',
      headers: { 'x-request-id': 'incoming-correlation-id' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const setHeader = jest.fn();
    const res = {
      statusCode: 200,
      getHeader: jest.fn().mockReturnValue('10'),
      getHeaders: jest.fn().mockReturnValue({}),
      setHeader,
      on: (event: string, cb: () => void) => {
        if (event === 'finish') cb();
      },
      locals: {},
    } as unknown as Response;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'incoming-correlation-id',
    );
    expect(mockLogger.log).toHaveBeenCalledWith(
      'GET /test-correlation',
      expect.objectContaining({
        http: expect.objectContaining({
          correlationId: 'incoming-correlation-id',
        }),
      }),
      'HTTP',
    );
  });

  it('generates a correlation ID when none is provided on the request', () => {
    const req = {
      method: 'GET',
      originalUrl: '/test-generated-id',
      path: '/test-generated-id',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const setHeader = jest.fn();
    const res = {
      statusCode: 200,
      getHeader: jest.fn().mockReturnValue('10'),
      getHeaders: jest.fn().mockReturnValue({}),
      setHeader,
      on: (event: string, cb: () => void) => {
        if (event === 'finish') cb();
      },
      locals: {},
    } as unknown as Response;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    expect(mockLogger.log).toHaveBeenCalledWith(
      'GET /test-generated-id',
      expect.objectContaining({
        http: expect.objectContaining({
          correlationId: expect.any(String),
        }),
      }),
      'HTTP',
    );
  });

  it('redacts credentials in a response body', () => {
    const result = sanitizeResponseBody({
      email: 'test@example.com',
      accessToken: 'jwt-value',
      refreshToken: 'refresh-value',
      apiKey: 'api-value',
      profile: { passwordHash: 'hash', name: 'john' },
    });

    expect(result).toEqual({
      email: 'test@example.com',
      accessToken: '[REDACTED]',
      refreshToken: '[REDACTED]',
      apiKey: '[REDACTED]',
      profile: { passwordHash: '[REDACTED]', name: 'john' },
    });
  });

  it('logs the sanitized response body written with res.json', () => {
    const req = {
      method: 'POST',
      originalUrl: '/auth/login',
      path: '/auth/login',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    let finish: (() => void) | undefined;
    const written: unknown[] = [];
    const res = {
      statusCode: 200,
      getHeader: jest.fn().mockReturnValue('10'),
      getHeaders: jest.fn().mockReturnValue({}),
      setHeader: jest.fn(),
      on: (event: string, cb: () => void) => {
        if (event === 'finish') finish = cb;
      },
      json: (body: unknown) => {
        written.push(body);
        return res;
      },
      send: (body: unknown) => {
        written.push(body);
        return res;
      },
      locals: {},
    } as unknown as Response;

    middleware.use(req, res, jest.fn());
    const body = {
      accessToken: 'jwt-value',
      user: { email: 'test@example.com', password: 'plain' },
    };
    res.json(body);
    finish?.();

    // The original response writer still receives the untouched payload.
    expect(written).toEqual([body]);
    expect(mockLogger.log).toHaveBeenCalledWith(
      'POST /auth/login',
      expect.objectContaining({
        http: expect.objectContaining({
          responseBody: {
            accessToken: '[REDACTED]',
            user: { email: 'test@example.com', password: '[REDACTED]' },
          },
        }),
      }),
      'HTTP',
    );
  });

  it('bounds and summarises large or binary response bodies', () => {
    const large = sanitizeResponseBody({ data: 'x'.repeat(5000) });
    expect(typeof large).toBe('string');
    expect(large).toContain('...[truncated]');
    expect((large as string).length).toBeLessThanOrEqual(4110);

    expect(sanitizeResponseBody(Buffer.from('binary'))).toBe(
      '[buffer 6 bytes]',
    );
  });
});
