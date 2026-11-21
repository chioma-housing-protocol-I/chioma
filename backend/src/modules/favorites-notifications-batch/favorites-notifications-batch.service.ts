import { Injectable, BadRequestException } from '@nestjs/common';
import { FavoritesService } from '../favorites/favorites.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  FavoritesNotificationsBatchOperationItemDto,
  BatchOperationType,
} from './dto/batch-request.dto';

export interface FavoritesNotificationsBatchOperationResult {
  type: BatchOperationType;
  id: string;
  success: boolean;
  error?: string;
}

export interface FavoritesNotificationsBatchResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: FavoritesNotificationsBatchOperationResult[];
}

@Injectable()
export class FavoritesNotificationsBatchService {
  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs each operation in order against the same guarded single-item
   * service method a regular request to its equivalent single-item
   * endpoint would use, under the calling user's own id. Operations run
   * sequentially and independently: one item failing (not found, already
   * in that state, etc.) does not abort the rest of the batch.
   */
  async execute(
    userId: string,
    operations: FavoritesNotificationsBatchOperationItemDto[],
  ): Promise<FavoritesNotificationsBatchResponse> {
    const results: FavoritesNotificationsBatchOperationResult[] = [];

    for (const operation of operations) {
      try {
        await this.runOne(userId, operation);
        results.push({
          type: operation.type,
          id: operation.id,
          success: true,
        });
      } catch (error) {
        results.push({
          type: operation.type,
          id: operation.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  private async runOne(
    userId: string,
    operation: FavoritesNotificationsBatchOperationItemDto,
  ): Promise<void> {
    switch (operation.type) {
      case BatchOperationType.REMOVE_FAVORITE:
        await this.favoritesService.removeFavorite(userId, operation.id);
        return;
      case BatchOperationType.MARK_NOTIFICATION_READ:
        await this.notificationsService.markAsRead(operation.id, userId);
        return;
      case BatchOperationType.DELETE_NOTIFICATION:
        await this.notificationsService.deleteNotification(
          operation.id,
          userId,
        );
        return;
      default: {
        // Unreachable given BatchOperationType's known members, but guards
        // against a value that only satisfies the type at compile time
        // (e.g. an unvalidated internal caller) reaching here at runtime.
        const unhandledType: string = operation.type;
        throw new BadRequestException(
          `Unsupported batch operation type: ${unhandledType}`,
        );
      }
    }
  }
}
