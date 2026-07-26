import type { QueryClient } from '@tanstack/react-query';
import { cancellationManager } from './manager';

export function cancelQueryByKey(client: QueryClient, queryKey: string) {
  cancellationManager.cancel(queryKey);
  client.cancelQueries({ queryKey: [queryKey] });
}

export function cancelAllQueries(client: QueryClient) {
  const count = cancellationManager.cancelAll();
  client.cancelQueries();
  return count;
}
