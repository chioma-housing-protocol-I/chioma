import { BadRequestException, HttpException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../errors/error-codes';
import { RateLimitError } from '../errors/domain-errors';
import { BaseAppError } from '../errors/base.error';

const buildArgumentsHost = (request: any, response: any): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getType: () => 'http',
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  }) as unknown as ArgumentsHost;

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: any;
  let request: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    request = {
      url: '/api/test',
      method: 'POST',
      headers: { 'x-request-id': 'request-id' },
    };
  });

  it('formats validation errors consistently for ValidationPipe bad requests', () => {
    const exception = new BadRequestException([
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ]);

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: [
            'email must be an email',
            'password must be longer than or equal to 8 characters',
          ],
          code: ErrorCode.VALIDATION_FAILED,
          path: '/api/test',
        }),
      }),
    );
    const [body] = response.json.mock.calls[0];
    expect(body.error.details).toEqual([
      { message: 'email must be an email' },
      { message: 'password must be longer than or equal to 8 characters' },
    ]);
  });

  it('returns generic internal server error shape for unexpected exceptions', () => {
    const exception = new Error('Unhandled');

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          path: '/api/test',
        }),
      }),
    );
  });

  it('preserves custom HttpException response bodies as details', () => {
    const exception = new HttpException(
      { message: 'Custom body', extra: 'data' },
      403,
    );

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Custom body',
          details: { extra: 'data' },
          path: '/api/test',
          requestId: 'request-id',
        }),
      }),
    );
  });

  it('sets a Retry-After header for RateLimitError and omits retryAfter from the JSON body', () => {
    const exception = new RateLimitError('Too many requests', 42);

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(response.status).toHaveBeenCalledWith(429);
    const [body] = response.json.mock.calls[0];
    expect(body.error).not.toHaveProperty('retryAfter');
  });

  it('does not set a Retry-After header when the exception has no retryAfter', () => {
    const exception = new BadRequestException('Bad input');

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.setHeader).not.toHaveBeenCalledWith(
      'Retry-After',
      expect.anything(),
    );
  });

  it('sets a Retry-After header for throttler 429 HttpExceptions and omits retryAfter from the JSON body', () => {
    const exception = new HttpException('Too Many Requests', 429);

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(response.status).toHaveBeenCalledWith(429);
    const [body] = response.json.mock.calls[0];
    expect(body.error).not.toHaveProperty('retryAfter');
    expect(body.error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
  });

  it('nests BaseAppError context under error.details', () => {
    const exception = new BaseAppError(
      ErrorCode.INSUFFICIENT_FUNDS,
      402,
      'Not enough balance',
      true,
      { available: 25, requested: 100 },
    );

    filter.catch(exception, buildArgumentsHost(request, response));

    const [body] = response.json.mock.calls[0];
    expect(body.error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS);
    expect(body.error.details).toEqual({ available: 25, requested: 100 });
  });
});
