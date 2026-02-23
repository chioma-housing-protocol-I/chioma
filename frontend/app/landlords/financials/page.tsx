'use client';

import React, { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/SkeletonTable';

export default function FinancialsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Financials</h1>
        <p className="text-neutral-500 mt-1">
          Monitor your transactions and financial health
        </p>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Transactions Found"
          description="It looks like you don't have any financial activity yet. Once your properties start generating revenue or incurring expenses, they will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Table goes here */}
        </div>
      )}
    </div>
  );
}
