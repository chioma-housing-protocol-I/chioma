import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWallet, classifyWalletError } from '../useWallet';

const eventCallbacks: Record<string, ((event: unknown) => void) | undefined> =
  {};

vi.mock('@/lib/stellar-wallets-kit', () => {
  const KitEventType = {
    STATE_UPDATED: 'STATE_UPDATE',
    WALLET_SELECTED: 'WALLET_SELECTED',
    DISCONNECT: 'DISCONNECT',
  };

  return {
    initializeStellarWalletsKit: vi.fn(),
    KitEventType,
    StellarWalletsKit: {
      setWallet: vi.fn(),
      fetchAddress: vi.fn(),
      disconnect: vi.fn(),
      refreshSupportedWallets: vi.fn().mockResolvedValue([]),
      on: vi.fn((type: string, callback: (event: unknown) => void) => {
        eventCallbacks[type] = callback;
        return vi.fn();
      }),
    },
  };
});

import { StellarWalletsKit, KitEventType } from '@/lib/stellar-wallets-kit';

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(eventCallbacks)) delete eventCallbacks[key];
  });

  it('starts disconnected with no address or error', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.address).toBeUndefined();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reflects the kit STATE_UPDATED event reactively (e.g. a restored reload connection)', () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      eventCallbacks[KitEventType.STATE_UPDATED]?.({
        eventType: KitEventType.STATE_UPDATED,
        payload: { address: 'GRESTORED', networkPassphrase: 'Test Network' },
      });
    });

    expect(result.current.address).toBe('GRESTORED');
    expect(result.current.isConnected).toBe(true);
  });

  it('clears address and walletId on a DISCONNECT event', () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      eventCallbacks[KitEventType.STATE_UPDATED]?.({
        eventType: KitEventType.STATE_UPDATED,
        payload: { address: 'GABC', networkPassphrase: 'Test Network' },
      });
    });
    expect(result.current.address).toBe('GABC');

    act(() => {
      eventCallbacks[KitEventType.DISCONNECT]?.({
        eventType: KitEventType.DISCONNECT,
        payload: {},
      });
    });

    expect(result.current.address).toBeUndefined();
    expect(result.current.walletId).toBeUndefined();
  });

  it('connect() sets the wallet, fetches the address, and updates state', async () => {
    vi.mocked(StellarWalletsKit.fetchAddress).mockResolvedValue({
      address: 'GCONNECTED',
    });

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(StellarWalletsKit.setWallet).toHaveBeenCalledWith('freighter');
    expect(result.current.address).toBe('GCONNECTED');
    expect(result.current.walletId).toBe('freighter');
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('connect() classifies a failure, stores it on state, and rethrows it', async () => {
    vi.mocked(StellarWalletsKit.fetchAddress).mockRejectedValue({
      code: -1,
      message: 'The user closed the modal.',
    });

    const { result } = renderHook(() => useWallet());

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect('freighter');
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toEqual({
      reason: 'rejected',
      message: 'The user closed the modal.',
    });
    expect(result.current.error).toEqual({
      reason: 'rejected',
      message: 'The user closed the modal.',
    });
    expect(result.current.address).toBeUndefined();
  });

  it('disconnect() calls the kit and clears local state', async () => {
    const { result } = renderHook(() => useWallet());

    act(() => {
      eventCallbacks[KitEventType.STATE_UPDATED]?.({
        eventType: KitEventType.STATE_UPDATED,
        payload: { address: 'GABC', networkPassphrase: 'Test Network' },
      });
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(StellarWalletsKit.disconnect).toHaveBeenCalled();
    expect(result.current.address).toBeUndefined();
  });

  it('clearError() resets the error state', async () => {
    vi.mocked(StellarWalletsKit.fetchAddress).mockRejectedValue(
      new Error('boom'),
    );
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter').catch(() => {});
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();
  });

  it('listWallets() proxies to the kit', async () => {
    const wallets = [
      {
        id: 'freighter',
        name: 'Freighter',
        type: 'HOT_WALLET',
        isAvailable: true,
        isPlatformWrapper: false,
        icon: '',
        url: '',
      },
    ];
    vi.mocked(StellarWalletsKit.refreshSupportedWallets).mockResolvedValue(
      wallets,
    );

    const { result } = renderHook(() => useWallet());
    const list = await result.current.listWallets();

    expect(list).toEqual(wallets);
  });
});

describe('classifyWalletError', () => {
  it('classifies a "not installed" style message', () => {
    expect(
      classifyWalletError({ message: 'Freighter is not installed.' }).reason,
    ).toBe('not-installed');
  });

  it('classifies code -1 and -4 as rejected', () => {
    expect(classifyWalletError({ code: -1, message: 'x' }).reason).toBe(
      'rejected',
    );
    expect(classifyWalletError({ code: -4, message: 'x' }).reason).toBe(
      'rejected',
    );
  });

  it('classifies a "wrong network" style message', () => {
    expect(
      classifyWalletError({ message: 'Wrong network selected' }).reason,
    ).toBe('wrong-network');
  });

  it('falls back to unknown for an unrecognized error', () => {
    expect(classifyWalletError({ message: 'Something exploded' }).reason).toBe(
      'unknown',
    );
  });

  it('falls back to unknown for a non-object, non-string error', () => {
    expect(classifyWalletError(undefined).reason).toBe('unknown');
  });
});
