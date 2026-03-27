'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { AgentTransaction } from '@/types';
import TransactionTable from '@/components/agent/TransactionTable';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AgentTransactionsPage() {
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real scenario, we'd get the agent address from the auth context
      // For now, we'll try to find it or use a placeholder if not found
      // Assuming the user is logged in as an agent
      const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      const agentAddress = userInfo.walletAddress || userInfo.address;

      if (!agentAddress) {
        throw new Error('Agent wallet address not found. Please log in.');
      }

      const response = await apiClient.get<AgentTransaction[]>(
        `/agents/registry/transactions/${agentAddress}`,
      );
      setTransactions(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch transactions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load transactions',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-xs font-bold uppercase tracking-widest mb-2"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Transaction Tracking
          </h1>
          <p className="text-blue-300/60 mt-1 max-w-2xl">
            Monitor all your verified property transactions, commission
            completions, and blockchain audit trails.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 text-white px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-4 text-sm font-bold text-red-400 hover:underline uppercase tracking-widest"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-white/5 animate-pulse rounded-2xl border border-white/10"
            />
          ))}
        </div>
      ) : (
        <TransactionTable transactions={transactions} />
      )}
    </div>
  );
}
