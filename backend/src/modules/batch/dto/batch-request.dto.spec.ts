import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BatchRequestDto,
  BatchOperationType,
  MAX_BATCH_SIZE,
} from './batch-request.dto';

async function validateBatch(input: unknown): Promise<number> {
  const dto = plainToInstance(BatchRequestDto, input);
  const errors = await validate(dto);
  return errors.length;
}

describe('BatchRequestDto', () => {
  it('accepts a single valid operation', async () => {
    const errorCount = await validateBatch({
      operations: [{ type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' }],
    });
    expect(errorCount).toBe(0);
  });

  it('accepts a mix of all supported operation types', async () => {
    const errorCount = await validateBatch({
      operations: [
        { type: BatchOperationType.REMOVE_FAVORITE, id: 'prop-1' },
        { type: BatchOperationType.MARK_NOTIFICATION_READ, id: 'notif-1' },
        { type: BatchOperationType.DELETE_NOTIFICATION, id: 'notif-2' },
      ],
    });
    expect(errorCount).toBe(0);
  });

  it('rejects an empty operations array', async () => {
    const errorCount = await validateBatch({ operations: [] });
    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects a missing operations field', async () => {
    const errorCount = await validateBatch({});
    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an operation with an unknown type', async () => {
    const errorCount = await validateBatch({
      operations: [{ type: 'deleteEverything', id: 'x' }],
    });
    expect(errorCount).toBeGreaterThan(0);
  });

  it('rejects an operation missing its id', async () => {
    const errorCount = await validateBatch({
      operations: [{ type: BatchOperationType.REMOVE_FAVORITE }],
    });
    expect(errorCount).toBeGreaterThan(0);
  });

  it(`rejects more than ${MAX_BATCH_SIZE} operations`, async () => {
    const operations = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) => ({
      type: BatchOperationType.REMOVE_FAVORITE,
      id: `prop-${i}`,
    }));
    const errorCount = await validateBatch({ operations });
    expect(errorCount).toBeGreaterThan(0);
  });

  it(`accepts exactly ${MAX_BATCH_SIZE} operations`, async () => {
    const operations = Array.from({ length: MAX_BATCH_SIZE }, (_, i) => ({
      type: BatchOperationType.REMOVE_FAVORITE,
      id: `prop-${i}`,
    }));
    const errorCount = await validateBatch({ operations });
    expect(errorCount).toBe(0);
  });
});
