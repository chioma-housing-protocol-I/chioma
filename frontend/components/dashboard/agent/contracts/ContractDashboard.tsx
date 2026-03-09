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
        <h1 className="text-2xl font-bold text-neutral-900">
          Contracts & Legal
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
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
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                isActive
                  ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-200'
                  : 'bg-white text-neutral-700 border-neutral-100 hover:border-neutral-200 hover:shadow-sm'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isActive ? 'bg-white/20' : 'bg-neutral-100'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-neutral-500'}
                />
              </div>
              <div>
                <span
                  className={`block text-2xl font-bold leading-none ${
                    isActive ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  {counts[tab.key]}
                </span>
                <span
                  className={`block text-xs font-medium mt-0.5 ${
                    isActive ? 'text-white/80' : 'text-neutral-500'
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
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by property, contract ID, landlord, or tenant..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/5 transition-all"
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
