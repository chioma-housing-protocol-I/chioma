'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TransactionsTableProps, Transaction } from './types';
import { formatDate, formatCurrency } from '@/lib/utils/format';

/**
 * Transactions table with filtering and sorting
 * Displays transaction history with status indicators
 */
export function TransactionsTable({
  transactions,
  maxRows = 10,
  onRowClick,
  showFilters = true,
  className = '',
}: TransactionsTableProps) {
  const [filter, setFilter] = useState<Transaction['type'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const filtered = useMemo(() => {
    let result = transactions;

    if (filter !== 'all') {
      result = result.filter((t) => t.type === filter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

    return result.slice(0, maxRows);
  }, [transactions, filter, sortBy, maxRows]);

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    const labels: Record<Transaction['type'], string> = {
      rent: 'Rent Payment',
      deposit: 'Security Deposit',
      refund: 'Refund',
      commission: 'Commission',
      maintenance: 'Maintenance',
      other: 'Other',
    };
    return labels[type];
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden ${className}`}
    >
      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50"
          >
            <option value="all">All Types</option>
            <option value="rent">Rent</option>
            <option value="deposit">Deposit</option>
            <option value="refund">Refund</option>
            <option value="commission">Commission</option>
            <option value="maintenance">Maintenance</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-400/50"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-left font-semibold text-blue-300/60">
                Type
              </th>
              <th className="px-6 py-4 text-left font-semibold text-blue-300/60">
                Description
              </th>
              <th className="px-6 py-4 text-left font-semibold text-blue-300/60">
                Amount
              </th>
              <th className="px-6 py-4 text-left font-semibold text-blue-300/60">
                Date
              </th>
              <th className="px-6 py-4 text-left font-semibold text-blue-300/60">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-blue-200/50"
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              filtered.map((transaction) => (
                <tr
                  key={transaction.id}
                  onClick={() => onRowClick?.(transaction)}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {getTypeLabel(transaction.type)}
                  </td>
                  <td className="px-6 py-4 text-blue-200/70">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  <td className="px-6 py-4 text-blue-200/70">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                        transaction.status,
                      )}`}
                    >
                      {transaction.status.charAt(0).toUpperCase() +
                        transaction.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TransactionsTable;
