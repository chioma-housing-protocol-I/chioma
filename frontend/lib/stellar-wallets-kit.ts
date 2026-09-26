import { StellarWalletsKit } from '@jsr/creit-tech__stellar-wallets-kit/sdk';
import {
  SwkAppDarkTheme,
  KitEventType,
  type ISupportedWallet,
} from '@jsr/creit-tech__stellar-wallets-kit/types';
import { defaultModules } from '@jsr/creit-tech__stellar-wallets-kit/modules/utils';

let isInitialized = false;

export const initializeStellarWalletsKit = () => {
  if (isInitialized) return;

  try {
    StellarWalletsKit.init({
      theme: SwkAppDarkTheme,
      modules: defaultModules(),
    });
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize Stellar Wallets Kit:', error);
  }
};

export { StellarWalletsKit, KitEventType };
export type { ISupportedWallet };
