'use client';

import { useState, useMemo } from 'react';
import { FileText, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';
import type { Contract, ContractFilterTab } from '@/types/contracts';
import { mockContracts } from '@/data/mock-contracts';
import { ContractCard } from './ContractCard';
import { ContractDetailsModal } from './ContractDetailsModal';
import { EmptyState } from '@/components/ui/EmptyState';

const FILTER_TABS: {
  key: ContractFilterTab;
  label: string;
  icon: typeof FileText;
}[] = [
  { key: 'ALL', label: 'All Contracts', icon: FileText },
  { key: 'ACTIVE', label: 'Active', icon: CheckCircle2 },
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'EXPIRED', label: 'Expired', icon: XCircle },
];

export function ContractDashboard() {
  const [activeTab, setActiveTab] = useState<ContractFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );

  const filteredContracts = useMemo(() => {
    let results = mockContracts;

    if (activeTab !== 'ALL') {
      results = results.filter((c) => c.status === activeTab);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.propertyName.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          c.landlord.name.toLowerCase().includes(query) ||
          c.tenant.name.toLowerCase().includes(query) ||
          c.propertyAddress.toLowerCase().includes(query),
      );
    }

    return results;
  }, [activeTab, searchQuery]);

  const counts = useMemo(
    () => ({
      ALL: mockContracts.length,
      ACTIVE: mockContracts.filter((c) => c.status === 'ACTIVE').length,
      PENDING: mockContracts.filter((c) => c.status === 'PENDING').length,
      EXPIRED: mockContracts.filter((c) => c.status === 'EXPIRED').length,
    }),
    [],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
          Contracts & Legal
        </h1>
        <p className="text-sm text-blue-200/60 font-medium mt-1">
          Manage all smart-contract leases you are a party to on the Stellar
          network.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 p-5 rounded-2xl border transition-all text-left group ${
                isActive
                  ? 'bg-blue-600/20 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                  : 'bg-white/5 text-blue-200/40 border-white/10 hover:border-white/20 hover:bg-white/10 shadow-sm'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-blue-500 border-blue-400 shadow-lg'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? 'text-white'
                      : 'text-blue-400/60 group-hover:text-blue-400'
                  }
                />
              </div>
              <div>
                <span
                  className={`block text-2xl font-bold leading-none tracking-tight ${
                    isActive
                      ? 'text-white'
                      : 'text-white/90 group-hover:text-white'
                  }`}
                >
                  {counts[tab.key]}
                </span>
                <span
                  className={`block text-[10px] font-bold uppercase tracking-widest mt-1.5 ${
                    isActive
                      ? 'text-blue-200'
                      : 'text-blue-300/40 group-hover:text-blue-300/60'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by property, contract ID, landlord, or tenant..."
          className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-blue-300/20 outline-none focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(37,99,235,0.1)] transition-all"
        />
      </div>

      {/* Contract Grid */}
      {filteredContracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onViewDetails={setSelectedContract}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No contracts found"
          description={
            searchQuery
              ? `No contracts match "${searchQuery}". Try a different search term.`
              : 'There are no contracts in this category yet.'
          }
        />
      )}

      {/* Details Modal */}
      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
}
