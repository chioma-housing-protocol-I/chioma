'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';

// ── Types ─────────────────────────────────────────────────────────────────

interface StellarBalanceLine {
  asset_type: string;
  asset_code?: string;
  balance: string;
}

export interface StellarNetworkAccount {
  publicKey: string;
  sequenceNumber: string;
  balances: StellarBalanceLine[];
}

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * Fetch live account info (including balances) from the Stellar network
 * for a connected wallet's public key.
 */
export function useStellarNetworkAccount(publicKey: string | null) {
  return useQuery({
    queryKey: queryKeys.stellarAccounts.network(publicKey ?? ''),
    queryFn: async () => {
      const { data } = await apiClient.get<StellarNetworkAccount>(
        `/stellar/accounts/${publicKey}/network`,
      );
      return data;
    },
    enabled: Boolean(publicKey),
    staleTime: 30_000,
  });
}

/**
 * Reads a single asset balance from a network account. XLM lives on the
 * `native` balance line; issued assets (USDC) match by asset code.
 */
export function readAssetBalance(
  account: StellarNetworkAccount | undefined,
  asset: 'XLM' | string,
): number | null {
  if (!account?.balances) return null;
  const line =
    asset === 'XLM'
      ? account.balances.find((b) => b.asset_type === 'native')
      : account.balances.find((b) => b.asset_code === asset);
  if (!line) return null;
  const value = Number(line.balance);
  return Number.isFinite(value) ? value : null;
}
