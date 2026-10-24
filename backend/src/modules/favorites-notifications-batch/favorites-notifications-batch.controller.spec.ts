import { Test, TestingModule } from '@nestjs/testing';
import { FavoritesNotificationsBatchController } from './favorites-notifications-batch.controller';
import { FavoritesNotificationsBatchService } from './favorites-notifications-batch.service';
import { BatchOperationType } from './dto/batch-request.dto';
import type { User } from '../users/entities/user.entity';

describe('FavoritesNotificationsBatchController', () => {
  let controller: FavoritesNotificationsBatchController;
  let batchService: { execute: jest.Mock };

  beforeEach(async () => {
    batchService = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoritesNotificationsBatchController],
      providers: [
        { provide: FavoritesNotificationsBatchService, useValue: batchService },
      ],
    }).compile();

    controller = module.get(FavoritesNotificationsBatchController);
  });

  it('delegates to FavoritesNotificationsBatchService.execute with the authenticated user id and the request operations', async () => {
    const expected = { total: 1, succeeded: 1, failed: 0, results: [] };
    batchService.execute.mockResolvedValue(expected);

    const user = { id: 'user-1' } as User;
    const result = await controller.execute(user, {
      operations: [{ type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' }],
    });

    expect(batchService.execute).toHaveBeenCalledWith('user-1', [
      { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
    ]);
    expect(result).toBe(expected);
  });
});
