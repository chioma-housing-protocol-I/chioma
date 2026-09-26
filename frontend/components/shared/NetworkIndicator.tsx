'use client';

import { getConfiguredNetwork } from '@/lib/stellar-network';

/**
 * Persistent, app-wide banner that tells the user which Stellar network this
 * app is configured for. Mounted once in `RootLayoutClient` so it appears on
 * every page.
 *
 * Deliberately renders nothing on `PUBLIC` (mainnet) — the acceptance
 * criteria only calls for non-mainnet networks to be visibly labelled.
 * Mistaking testnet for mainnet is the expensive, silent failure mode this
 * guards against; mainnet itself needs no extra chrome.
 */
export default function NetworkIndicator() {
  const network = getConfiguredNetwork();

  if (network === 'PUBLIC') return null;

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-2 text-sm font-medium">
        <span
          className="inline-flex items-center rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-bold tracking-wide uppercase"
          data-testid="network-indicator-badge"
        >
          {network}
        </span>
        <span>
          This app is connected to the Stellar {network.toLowerCase()} —
          transactions are not real.
        </span>
      </div>
    </div>
  );
}
