import {
  LoggerMiddleware,
  sanitizeBody,
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
});
