import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BatchRequestDto, BATCH_MAX_REQUESTS } from './dto/batch-request.dto';
import { BatchService } from './batch.service';

@ApiTags('batch')
@Controller({ path: 'batch', version: '1' })
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  // A batch call can fan out to up to BATCH_MAX_REQUESTS sub-requests, so
  // it's throttled tighter than an ordinary endpoint to stop batching from
  // becoming a way to amplify past each sub-endpoint's own rate limit.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Execute up to ' + BATCH_MAX_REQUESTS + ' requests in one call',
    description:
      'Combines multiple GET/POST requests into a single round trip (#2077), ' +
      'for clients (mobile in particular) that would otherwise pay N separate ' +
      'network round trips to render one screen. Each sub-request still goes ' +
      'through the normal auth, rate limiting, and versioning for its path; ' +
      'this does not grant any access a direct call to that path would not.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Array of { status, body } results, one per sub-request, in the same order as the request.',
  })
  async execute(
    @Body() dto: BatchRequestDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-api-key') apiKey?: string,
  ) {
    const results = await this.batchService.execute(dto.requests, {
      authorization,
      'x-api-key': apiKey,
    });
    return { results };
  }
}
