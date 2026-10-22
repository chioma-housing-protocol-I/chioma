import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { BatchSubRequestDto } from './dto/batch-request.dto';

export interface BatchSubResponse {
  status: number;
  body: unknown;
}

/**
 * Executes each sub-request as a real HTTP call back into this same
 * server (#2077), rather than dispatching in-process against the Nest
 * router directly. A loopback call re-enters the full stack, global
 * guards (JwtAuthGuard/ApiKeyGuard), rate limiting, versioning, that an
 * in-process shortcut would have to reimplement or bypass; the cost is
 * one extra localhost round trip per sub-request, which is still far
 * cheaper than the client making N separate network round trips.
 */
@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(private readonly httpService: HttpService) {}

  async execute(
    requests: BatchSubRequestDto[],
    forwardHeaders: Record<string, string | undefined>,
  ): Promise<BatchSubResponse[]> {
    const port = process.env.PORT ?? 5000;
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    return Promise.all(
      requests.map(async (sub) => {
        try {
          const response = await firstValueFrom(
            this.httpService.request({
              method: sub.method,
              url: `${baseUrl}${sub.path}`,
              data: sub.method === 'POST' ? sub.body : undefined,
              headers: {
                authorization: forwardHeaders.authorization,
                'x-api-key': forwardHeaders['x-api-key'],
                'content-type': 'application/json',
              },
              timeout: 10_000,
              validateStatus: () => true,
            }),
          );
          return { status: response.status, body: response.data };
        } catch (error) {
          const axiosError = error as AxiosError;
          this.logger.warn(
            `Batch sub-request ${sub.method} ${sub.path} failed: ${axiosError.message}`,
          );
          return {
            status: axiosError.response?.status ?? 502,
            body: { message: 'Batch sub-request failed', path: sub.path },
          };
        }
      }),
    );
  }
}
