'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  initializeStellarWalletsKit,
  StellarWalletsKit,
  KitEventType,
  type ISupportedWallet,
} from '@/lib/stellar-wallets-kit';

export type WalletErrorReason =
  'not-installed' | 'rejected' | 'wrong-network' | 'unknown';

export interface WalletError {
  reason: WalletErrorReason;
  message: string;
}

interface WalletState {
  address: string | undefined;
  walletId: string | undefined;
  isConnecting: boolean;
  error: WalletError | null;
}

/**
 * The kit itself doesn't classify errors beyond a raw `{code, message}`
 * shape, so callers are left guessing. `not-installed` and `rejected` are
 * distinguished by message content because that's all the kit's modules
 * (Freighter, xBull, Albedo, ...) give us — there's no shared error-code
 * enum across wallet extensions.
 */
export function classifyWalletError(error: unknown): WalletError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: number }).code
      : undefined;

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : typeof error === 'string'
          ? error
          : '';

  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes('not installed') ||
    normalized.includes('not detected') ||
    normalized.includes('no wallet found') ||
    normalized.includes('extension not found')
  ) {
    return {
      reason: 'not-installed',
      message: rawMessage || 'This wallet is not installed.',
    };
  }

  if (
    code === -1 ||
    code === -4 ||
    normalized.includes('closed the modal') ||
    normalized.includes('cancelled') ||
    normalized.includes('canceled') ||
    normalized.includes('reject') ||
    normalized.includes('user denied')
  ) {
    return {
      reason: 'rejected',
      message: rawMessage || 'The connection request was rejected.',
    };
  }

  if (
    normalized.includes('wrong network') ||
    normalized.includes('network mismatch') ||
    normalized.includes('unsupported network')
  ) {
    return {
      reason: 'wrong-network',
      message: rawMessage || 'Your wallet is set to the wrong network.',
    };
  }

  return {
    reason: 'unknown',
    message: rawMessage || 'Wallet connection failed.',
  };
}

/**
 * Centralizes Stellar wallet connection state so components don't each
 * reimplement it (#1554). The kit's own `activeAddress`/`selectedModuleId`
 * signals are already hydrated from localStorage at import time, so
 * `getAddress()` returning synchronously after a reload is what "restores"
 * a connection -- this hook just exposes that state reactively via
 * `KitEventType.STATE_UPDATED`/`WALLET_SELECTED` instead of components
 * having to call `getAddress()` imperatively and manage their own state.
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: undefined,
    walletId: undefined,
    isConnecting: false,
    error: null,
  });

  useEffect(() => {
    initializeStellarWalletsKit();

    const unsubscribeState = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        setState((prev) => ({ ...prev, address: event.payload.address }));
      },
    );

    const unsubscribeWallet = StellarWalletsKit.on(
      KitEventType.WALLET_SELECTED,
      (event) => {
        setState((prev) => ({ ...prev, walletId: event.payload.id }));
      },
    );

    const unsubscribeDisconnect = StellarWalletsKit.on(
      KitEventType.DISCONNECT,
      () => {
        setState((prev) => ({
          ...prev,
          address: undefined,
          walletId: undefined,
        }));
      },
    );

    return () => {
      unsubscribeState();
      unsubscribeWallet();
      unsubscribeDisconnect();
    };
  }, []);

  const listWallets = useCallback(async (): Promise<ISupportedWallet[]> => {
    initializeStellarWalletsKit();
    return StellarWalletsKit.refreshSupportedWallets();
  }, []);

  /**
   * Selects a wallet by id and fetches its address. Throws a classified
   * WalletError on failure (also stored on state.error) so callers can
   * choose to handle it locally or rely on the hook's own error state.
   */
  const connect = useCallback(async (walletId: string): Promise<string> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      initializeStellarWalletsKit();
      StellarWalletsKit.setWallet(walletId);
      const { address } = await StellarWalletsKit.fetchAddress();

      setState((prev) => ({
        ...prev,
        address,
        walletId,
        isConnecting: false,
        error: null,
      }));

      return address;
    } catch (error) {
      const classified = classifyWalletError(error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: classified,
      }));
      throw classified;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    setState((prev) => ({
      ...prev,
      address: undefined,
      walletId: undefined,
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    address: state.address,
    walletId: state.walletId,
    isConnecting: state.isConnecting,
    error: state.error,
    isConnected: Boolean(state.address),
    listWallets,
    connect,
    disconnect,
    clearError,
  };
}
