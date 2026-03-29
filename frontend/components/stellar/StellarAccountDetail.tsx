'use client';

import React, { useState } from 'react';
import {
  Copy,
  RefreshCw,
  Download,
  ExternalLink,
  CheckCircle,
  Key,
  Link2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ManagedStellarAccount } from '@/lib/services/stellar-accounts.service';
import { fetchNetworkAccountInfo, syncStellarAccount, exportAccountData } from '@/lib/services/stellar-accounts.service';
import { getStellarExpertAccountUrl } from '@/lib/stellar-network';
import { StellarAccountBalance } from './StellarAccountBalance';
import { StellarAccountHistory } from './StellarAccountHistory';

type Tab = 'overview' | 'history' | 'signers' | 'trustlines';

interface StellarAccountDetailProps {
  account: ManagedStellarAccount;
  onSync?: (updated: ManagedStellarAccount) => void;
}

export function StellarAccountDetail({ account, onSync }: StellarAccountDetailProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: networkInfo } = useQuery({
    queryKey: ['stellar-network-info', account.publicKey],
    queryFn: () => fetchNetworkAccountInfo(account.publicKey),
    staleTime: 60_000,
    retry: 1,
  });

  async function handleCopy() {
    await navigator.clipboard.writeText(account.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const updated = await syncStellarAccount(account.publicKey);
      onSync?.(updated);
    } catch {
      // silently fail — user can retry
    } finally {
      setSyncing(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'History' },
    { id: 'signers', label: 'Signers' },
    { id: 'trustlines', label: 'Trustlines' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  account.isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {account.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-slate-500">{account.accountType}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-slate-300 truncate">
                {account.publicKey}
              </p>
              <button
                onClick={handleCopy}
                aria-label="Copy public key"
                className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {copied ? (
                  <CheckCircle size={13} className="text-emerald-400" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            onClick={() => exportAccountData(account)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
          >
            <Download size={12} />
            Export
          </button>
          <a
            href={getStellarExpertAccountUrl(account.publicKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition-colors"
          >
            <ExternalLink size={12} />
            Explorer
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'overview' && (
          <div className="space-y-6">
            <StellarAccountBalance publicKey={account.publicKey} />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Account Info
              </p>
              {[
                { label: 'Created', value: new Date(account.createdAt).toLocaleDateString() },
                { label: 'Last Updated', value: new Date(account.updatedAt).toLocaleDateString() },
                { label: 'Sequence Number', value: account.sequenceNumber },
                {
                  label: 'Subentries',
                  value: networkInfo?.subentryCount?.toString() ?? '—',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs text-slate-300 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <StellarAccountHistory publicKey={account.publicKey} />
        )}

        {tab === 'signers' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Key size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Signers
              </span>
            </div>
            {networkInfo?.signers?.length ? (
              networkInfo.signers.map((signer) => (
                <div key={signer.key} className="px-3 py-2.5 rounded-lg bg-white/5">
                  <p className="font-mono text-xs text-slate-300 truncate">{signer.key}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Weight: {signer.weight} · Type: {signer.type}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No signers data available.</p>
            )}
          </div>
        )}

        {tab === 'trustlines' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={13} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Trustlines
              </span>
            </div>
            {networkInfo?.balances?.filter((b) => b.asset_type !== 'native').length ? (
              networkInfo.balances
                .filter((b) => b.asset_type !== 'native')
                .map((b) => (
                  <div key={`${b.asset_code}-${b.asset_issuer}`} className="px-3 py-2.5 rounded-lg bg-white/5">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-slate-300">{b.asset_code}</span>
                      <span className="text-xs text-slate-400">{parseFloat(b.balance).toFixed(2)}</span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
                      {b.asset_issuer}
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-xs text-slate-500">No trustlines found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
