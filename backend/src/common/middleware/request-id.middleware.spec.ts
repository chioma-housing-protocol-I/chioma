import { Request, Response } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';
import { requestContext } from '../request-context/request-context';

describe('RequestIdMiddleware', () => {
  const middleware = new RequestIdMiddleware();

  it('seeds the async request context with the incoming request id', () => {
    const req = {
      headers: { 'x-request-id': 'incoming-request-id' },
    } as unknown as Request;
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;

    let observedContext:
      | {
          requestId?: string;
          correlationId?: string;
        }
      | undefined;

    middleware.use(req, res, () => {
      observedContext = requestContext.get();
    });

    expect((req as Request & { requestId?: string }).requestId).toBe(
      'incoming-request-id',
    );
    expect((req as Request & { correlationId?: string }).correlationId).toBe(
      'incoming-request-id',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'incoming-request-id',
    );
    expect(observedContext).toEqual({
      requestId: 'incoming-request-id',
      correlationId: 'incoming-request-id',
    });
  });
});
