import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { BatchService, BatchResponse } from './batch.service';
import { BatchRequestDto } from './dto/batch-request.dto';

@Controller('api/batch')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiTags('Batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute multiple operations in a single request',
    description:
      "Runs a fixed set of known-safe, already-guarded operations (removeFavorite, markNotificationRead, deleteNotification) over a list of ids under the caller's own identity. Each item is applied independently; a failure in one does not prevent the others from running.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Batch processed. Check each result entry for its own success/error, since a 200 covers partial failure too.',
  })
  async execute(
    @CurrentUser() user: User,
    @Body() dto: BatchRequestDto,
  ): Promise<BatchResponse> {
    return this.batchService.execute(user.id, dto.operations);
  }
}
