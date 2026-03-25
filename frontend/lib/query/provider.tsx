'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './client';

/**
 * App-level React Query provider. Wraps children with a stable QueryClient
 * that persists across re-renders but is unique per browser tab.
 *
 * Place this once in the root layout alongside AuthHydrator.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
