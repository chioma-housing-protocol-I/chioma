import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { BatchService } from './batch.service';

describe('BatchService', () => {
  let service: BatchService;
  let httpService: { request: jest.Mock };

  beforeEach(async () => {
    httpService = { request: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(BatchService);
  });

  it('executes every sub-request and returns results in order', async () => {
    httpService.request
      .mockReturnValueOnce(of({ status: 200, data: { id: 1 } }))
      .mockReturnValueOnce(of({ status: 201, data: { id: 2 } }));

    const results = await service.execute(
      [
        { method: 'GET', path: '/properties' },
        { method: 'POST', path: '/bookings', body: { propertyId: '1' } },
      ],
      { authorization: 'Bearer token', 'x-api-key': undefined },
    );

    expect(results).toEqual([
      { status: 200, body: { id: 1 } },
      { status: 201, body: { id: 2 } },
    ]);
    expect(httpService.request).toHaveBeenCalledTimes(2);
  });

  it('forwards authorization and x-api-key headers to each sub-request', async () => {
    httpService.request.mockReturnValue(of({ status: 200, data: {} }));

    await service.execute([{ method: 'GET', path: '/properties' }], {
      authorization: 'Bearer abc',
      'x-api-key': 'key123',
    });

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer abc',
          'x-api-key': 'key123',
        }),
      }),
    );
  });

  it('only sends a body for POST sub-requests', async () => {
    httpService.request.mockReturnValue(of({ status: 200, data: {} }));

    await service.execute(
      [{ method: 'GET', path: '/properties', body: { should: 'be ignored' } }],
      {},
    );

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({ data: undefined }),
    );
  });

  it('isolates a failing sub-request to a 502 result instead of failing the whole batch', async () => {
    httpService.request
      .mockReturnValueOnce(of({ status: 200, data: { ok: true } }))
      .mockReturnValueOnce(
        throwError(
          () =>
            ({
              message: 'timeout',
              response: undefined,
            }) as AxiosError,
        ),
      );

    const results = await service.execute(
      [
        { method: 'GET', path: '/properties' },
        { method: 'GET', path: '/slow-endpoint' },
      ],
      {},
    );

    expect(results[0]).toEqual({ status: 200, body: { ok: true } });
    expect(results[1].status).toBe(502);
  });

  it('uses the upstream response status on a non-network sub-request failure', async () => {
    httpService.request.mockReturnValueOnce(
      throwError(
        () =>
          ({
            message: 'Not Found',
            response: { status: 404 },
          }) as AxiosError,
      ),
    );

    const results = await service.execute(
      [{ method: 'GET', path: '/does-not-exist' }],
      {},
    );

    expect(results[0].status).toBe(404);
  });
});
