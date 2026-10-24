import {
  IsArray,
  IsEnum,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * The fixed set of operations POST /api/batch can run. Each one maps
 * directly to an existing, already-guarded single-item service method —
 * this endpoint does not replay arbitrary REST calls, it only lets a
 * caller run one of these known-safe operations over many ids in a
 * single request instead of N round trips.
 */
export enum BatchOperationType {
  REMOVE_FAVORITE = 'removeFavorite',
  MARK_NOTIFICATION_READ = 'markNotificationRead',
  DELETE_NOTIFICATION = 'deleteNotification',
}

/** Batch requests are capped well below MAX_PAGE_SIZE-style limits since
 * every item runs sequentially inside one HTTP request. */
export const MAX_BATCH_SIZE = 50;

export class BatchOperationItemDto {
  @ApiProperty({
    description: 'The operation to run for this item.',
    enum: BatchOperationType,
  })
  @IsEnum(BatchOperationType)
  type: BatchOperationType;

  @ApiProperty({
    description:
      'The id the operation acts on (a propertyId for removeFavorite, or a notificationId for the notification operations).',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  id: string;
}

export class BatchRequestDto {
  @ApiProperty({
    description: `Operations to run, in order, within one request. Each item is applied independently — a failure in one does not prevent the others from running. Capped at ${MAX_BATCH_SIZE} items.`,
    type: [BatchOperationItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => BatchOperationItemDto)
  operations: BatchOperationItemDto[];
}
