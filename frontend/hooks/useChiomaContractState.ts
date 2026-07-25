'use client';

import { useQuery } from '@tanstack/react-query';
import { readChiomaState } from '@/lib/contracts/soroban-client';
import { getContractIds } from '@/lib/contracts/config';

export function useChiomaContractState() {
  const { chioma } = getContractIds();

  return useQuery({
    queryKey: ['chioma-contract-state', chioma],
    enabled: Boolean(chioma),
    queryFn: readChiomaState,
    staleTime: 120_000,
  });
}
