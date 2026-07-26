export interface BatchFailure<TItem> {
  item: TItem;
  error: string;
}

export interface BatchResult<TItem, TResult> {
  succeeded: TResult[];
  failed: BatchFailure<TItem>[];
  total: number;
}

/**
 * Runs an async operation for every item sequentially, continuing past
 * individual failures instead of aborting the whole batch. Callers get back
 * both the partial successes and the per-item errors instead of losing
 * everything to the first thrown exception.
 */
export async function runBatch<TItem, TResult>(
  items: TItem[],
  operation: (item: TItem) => Promise<TResult>,
): Promise<BatchResult<TItem, TResult>> {
  const succeeded: TResult[] = [];
  const failed: BatchFailure<TItem>[] = [];

  for (const item of items) {
    try {
      succeeded.push(await operation(item));
    } catch (error) {
      failed.push({
        item,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { succeeded, failed, total: items.length };
}
