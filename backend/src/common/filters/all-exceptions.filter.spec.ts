import { BadRequestException, HttpException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common/interfaces';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ErrorCode } from '../errors/error-codes';

const buildArgumentsHost = (request: any, response: any): ArgumentsHost => ({
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => response,
  }),
  getType: () => 'http',
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
} as unknown as ArgumentsHost);

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: any;
  let request: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
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
        statusCode: 400,
        message: [
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ],
        error: 'Bad Request',
        code: ErrorCode.VALIDATION_FAILED,
        path: '/api/test',
      }),
    );
  });

  it('returns generic internal server error shape for unexpected exceptions', () => {
    const exception = new Error('Unhandled');

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'An unexpected error occurred',
        error: 'Internal Server Error',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        path: '/api/test',
      }),
    );
  });

  it('preserves custom HttpException response bodies', () => {
    const exception = new HttpException(
      { message: 'Custom body', extra: 'data' },
      403,
    );

    filter.catch(exception, buildArgumentsHost(request, response));

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Custom body',
        extra: 'data',
        path: '/api/test',
        requestId: 'request-id',
      }),
    );
  });
});
