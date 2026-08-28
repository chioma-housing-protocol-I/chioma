import { env } from './env';

/** Matches `NEXT_PUBLIC_STELLAR_NETWORK` (default testnet). */
export type StellarNetworkId = 'TESTNET' | 'PUBLIC';

export function getConfiguredNetwork(): StellarNetworkId {
  return env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'PUBLIC' : 'TESTNET';
}

export function getHorizonServerUrl(): string {
  return getConfiguredNetwork() === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

export function getStellarExpertExplorerSegment(): 'testnet' | 'public' {
  return getConfiguredNetwork() === 'PUBLIC' ? 'public' : 'testnet';
}

export function getStellarExpertTxUrl(txHash: string): string {
  const seg = getStellarExpertExplorerSegment();
  return `https://stellar.expert/explorer/${seg}/tx/${encodeURIComponent(txHash)}`;
}

export function getStellarExpertAccountUrl(accountId: string): string {
  const seg = getStellarExpertExplorerSegment();
  return `https://stellar.expert/explorer/${seg}/account/${encodeURIComponent(accountId)}`;
}

export function getNetworkPassphrase(): string {
  return getConfiguredNetwork() === 'PUBLIC'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';
}
