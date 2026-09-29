import { describe, it, expect } from 'vitest';
import {
  getNetworkLabel,
  getNetworkPassphrase,
  matchWalletNetwork,
} from '@/lib/stellar-network';

describe('getNetworkLabel', () => {
  it('labels PUBLIC as Mainnet', () => {
    expect(getNetworkLabel('PUBLIC')).toBe('Mainnet');
  });

  it('labels TESTNET as Testnet', () => {
    expect(getNetworkLabel('TESTNET')).toBe('Testnet');
  });
});

describe('matchWalletNetwork', () => {
  it('returns "undetermined" when no wallet network info is available', () => {
    expect(matchWalletNetwork(null)).toEqual({ status: 'undetermined' });
  });

  it('returns "match" when the wallet passphrase equals the configured network passphrase', () => {
    expect(
      matchWalletNetwork({
        network: 'TESTNET',
        networkPassphrase: getNetworkPassphrase(),
      }),
    ).toEqual({ status: 'match' });
  });

  it('returns "mismatch" with the wallet-reported label when passphrases differ', () => {
    expect(
      matchWalletNetwork({
        network: 'PUBLIC',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      }),
    ).toEqual({ status: 'mismatch', walletNetworkLabel: 'PUBLIC' });
  });

  it('falls back to a generic label when the wallet reports an empty network name', () => {
    expect(
      matchWalletNetwork({
        network: '',
        networkPassphrase: 'Some other passphrase',
      }),
    ).toEqual({ status: 'mismatch', walletNetworkLabel: 'a different network' });
  });
});
