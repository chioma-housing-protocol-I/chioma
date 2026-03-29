'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchUserStellarAccounts,
  type ManagedStellarAccount,
} from '@/lib/services/stellar-accounts.service';
import { StellarAccountList } from './StellarAccountList';
import { StellarAccountDetail } from './StellarAccountDetail';
import { WalletConnectButton } from '@/components/blockchain/WalletConnectButton';

export function StellarAccountsView() {
  const { user } = useAuthStore();
  const [selectedAccount, setSelectedAccount] = useState<ManagedStellarAccount | null>(null);

  const {
    data: accounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['stellar-accounts', user?.id],
    queryFn: () => fetchUserStellarAccounts(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Auto-select first account when list loads
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  const handleSync = useCallback(
    (updated: ManagedStellarAccount) => {
      setSelectedAccount(updated);
      refetch();
    },
    [refetch],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Wallet size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Stellar Accounts</h1>
            <p className="text-xs text-slate-400">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} linked
            </p>
          </div>
        </div>
        <WalletConnectButton />
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar — account list */}
        <aside className="w-72 shrink-0 rounded-2xl bg-slate-800/50 border border-white/10 p-4 overflow-y-auto">
          <StellarAccountList
            accounts={accounts}
            selectedId={selectedAccount?.id ?? null}
            isLoading={isLoading}
            onSelect={setSelectedAccount}
          />
        </aside>

        {/* Detail panel */}
        <div className="flex-1 rounded-2xl bg-slate-800/50 border border-white/10 overflow-hidden">
          {selectedAccount ? (
            <StellarAccountDetail
              account={selectedAccount}
              onSync={handleSync}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                <Wallet size={28} className="text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Select an account
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Choose an account from the list to view details, balance, and
                transaction history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
