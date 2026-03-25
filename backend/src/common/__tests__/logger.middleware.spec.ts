import {
  LoggerMiddleware,
  sanitizeBody,
} from '../middleware/logger.middleware';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    process.env.NODE_ENV = 'production';
    middleware = new LoggerMiddleware(mockLogger);
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    jest.restoreAllMocks();
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

    expect(mockLogger.error).toHaveBeenCalled();
    const logCall = mockLogger.error.mock.calls[0];
    expect(logCall[0]).toContain('HTTP GET /test-error - 500');
    expect((logCall[2] as any).statusCode).toBe(500);
  });

  it('skips logging for /health endpoint', () => {
    const req = {
      path: '/health',
    } as Request;

    const res = {} as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
