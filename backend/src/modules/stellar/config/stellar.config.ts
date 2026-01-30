import { registerAs } from '@nestjs/config';

export interface StellarConfig {
  network: 'testnet' | 'mainnet';
  networkPassphrase: string;
  horizonUrl: string;
  baseFee: string;
  encryptionKey: string;
  friendbotUrl?: string;
  platformAccountPublicKey?: string;
  platformAccountSecretKey?: string;
}

export default registerAs('stellar', (): StellarConfig => {
  const network = (process.env.STELLAR_NETWORK || 'testnet') as
    | 'testnet'
    | 'mainnet';

  const isTestnet = network === 'testnet';

  return {
    network,
    networkPassphrase: isTestnet
      ? 'Test SDF Network ; September 2015'
      : 'Public Global Stellar Network ; September 2015',
    horizonUrl: isTestnet
      ? process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
      : process.env.STELLAR_HORIZON_URL || 'https://horizon.stellar.org',
    baseFee: process.env.STELLAR_BASE_FEE || '100',
    encryptionKey:
      process.env.STELLAR_ENCRYPTION_KEY ||
      'default-encryption-key-change-in-production',
    friendbotUrl: isTestnet
      ? process.env.STELLAR_FRIENDBOT_URL || 'https://friendbot.stellar.org'
      : undefined,
    platformAccountPublicKey: process.env.STELLAR_PLATFORM_PUBLIC_KEY,
    platformAccountSecretKey: process.env.STELLAR_PLATFORM_SECRET_KEY,
  };
});
