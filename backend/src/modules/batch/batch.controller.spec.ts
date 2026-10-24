import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { BatchOperationType } from './dto/batch-request.dto';
import type { User } from '../users/entities/user.entity';

describe('BatchController', () => {
  let controller: BatchController;
  let batchService: { execute: jest.Mock };

  beforeEach(async () => {
    batchService = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [{ provide: BatchService, useValue: batchService }],
    }).compile();

    controller = module.get(BatchController);
  });

  it('delegates to BatchService.execute with the authenticated user id and the request operations', async () => {
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
