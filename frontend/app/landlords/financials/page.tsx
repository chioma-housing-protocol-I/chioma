'use client';

import React, { useMemo, useState } from 'react';
import { Receipt, Download, FileText, Filter } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import TransactionsTable from '@/components/landlord-dashboard/TransactionsTable';
import SecurityDepositsSection, {
  getActiveDeposits,
} from '@/components/landlord-dashboard/SecurityDepositsSection';
import {
  MOCK_TRANSACTIONS,
  type Transaction,
  type TransactionType,
} from '@/lib/transactions-data';
import { exportTransactionsToCsv, exportTransactionsToPdf } from '@/lib/export-transactions';
import { format, subMonths, startOfDay, endOfDay, parseISO } from 'date-fns';

const TRANSACTION_TYPES: TransactionType[] = [
  'Rent',
  'Deposit',
  'Refund',
  'Service Fee',
];

const PROPERTIES = Array.from(
  new Set(MOCK_TRANSACTIONS.map((t) => t.propertyName))
).sort();

export default function FinancialsPage() {
  const [dateFrom, setDateFrom] = useState<string>(
    format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);

  const filteredTransactions = useMemo(() => {
    let list: Transaction[] = [...MOCK_TRANSACTIONS];
    const from = dateFrom ? startOfDay(parseISO(dateFrom)).getTime() : 0;
    const to = dateTo ? endOfDay(parseISO(dateTo)).getTime() : Infinity;
    list = list.filter((t) => {
      const tTime = new Date(t.date).getTime();
      if (tTime < from || tTime > to) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (propertyFilter !== 'all' && t.propertyName !== propertyFilter)
        return false;
      return true;
    });
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [dateFrom, dateTo, typeFilter, propertyFilter]);

  const activeDeposits = useMemo(
    () => getActiveDeposits(MOCK_TRANSACTIONS),
    []
  );

  const handleExportCsv = () => {
    exportTransactionsToCsv(filteredTransactions);
  };

  const handleExportPdf = () => {
    exportTransactionsToPdf(
      filteredTransactions,
      'Chioma – Transaction & Payment History'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Transaction & Payment History
          </h1>
          <p className="text-neutral-500 mt-1">
            View payments, security deposits, and blockchain ledger links
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Filter size={18} />
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-brand-blue-dark transition-colors shadow-sm"
          >
            <FileText size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
          <p className="text-sm font-medium text-neutral-700 mb-3">Filters</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-w-[140px] px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-w-[140px] px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as TransactionType | 'all')
                }
                className="w-full min-w-[140px] px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                <option value="all">All types</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Property
              </label>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full min-w-[160px] px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                <option value="all">All properties</option>
                {PROPERTIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {activeDeposits.length > 0 && (
        <SecurityDepositsSection activeDeposits={activeDeposits} />
      )}

      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-3">
          All transactions
        </h2>
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Transactions Found"
            description="No transactions match your filters. Try adjusting the date range, type, or property."
          />
        ) : (
          <TransactionsTable
            transactions={filteredTransactions}
            showProperty={true}
          />
        )}
      </div>
    </div>
  );
}
