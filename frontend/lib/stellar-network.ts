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

/** Human-readable label for a network, used in user-facing copy. */
export function getNetworkLabel(network: StellarNetworkId): string {
  return network === 'PUBLIC' ? 'Mainnet' : 'Testnet';
}

/**
 * The result of comparing the app's configured network against the network
 * the connected wallet reports.
 *
 * - `match`: the wallet's passphrase matches the app's configured network —
 *   safe to sign.
 * - `mismatch`: the wallet reports a *different* passphrase than the app is
 *   configured for — signing should be blocked, `walletNetworkLabel` is
 *   populated for the error message.
 * - `undetermined`: the connected wallet module doesn't support querying its
 *   network (e.g. Albedo, xBull — both throw on `getNetwork()`), or the
 *   query failed for any other reason. There is no evidence of a mismatch,
 *   but none of a match either.
 */
export type NetworkMatchResult =
  | { status: 'match' }
  | { status: 'mismatch'; walletNetworkLabel: string }
  | { status: 'undetermined' };

/**
 * Compares a wallet-reported network passphrase against the app's
 * configured network passphrase.
 *
 * Comparison is done on `networkPassphrase` rather than the `network` label
 * string: per the wallets kit's `ModuleInterface.getNetwork()` contract, the
 * `network` field is only documented as "a human-readable name for the
 * current network" and its exact value is module-defined, whereas the
 * passphrase is the canonical, unambiguous identifier for a Stellar network.
 */
export function matchWalletNetwork(
  walletNetwork: { network: string; networkPassphrase: string } | null,
): NetworkMatchResult {
  if (!walletNetwork) return { status: 'undetermined' };

  if (walletNetwork.networkPassphrase === getNetworkPassphrase()) {
    return { status: 'match' };
  }

  return {
    status: 'mismatch',
    walletNetworkLabel: walletNetwork.network || 'a different network',
  };
}
