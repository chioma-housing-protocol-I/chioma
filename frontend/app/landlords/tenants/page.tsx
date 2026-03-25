'use client';

import { useState, useMemo } from 'react';
import {
  User,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  UserPlus,
  Home,
  Calendar,
  DollarSign,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaseStatus = 'Active' | 'Pending Sign' | 'Arrears';
type SortField =
  | 'name'
  | 'property'
  | 'leaseStart'
  | 'leaseEnd'
  | 'rentAmount'
  | 'status';
type SortDir = 'asc' | 'desc';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  unit: string;
  leaseStart: string;
  leaseEnd: string;
  rentAmount: number;
  status: LeaseStatus;
  daysUntilExpiry: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TENANTS: Tenant[] = [
  {
    id: '1',
    name: 'Sarah Okafor',
    email: 'sarah.okafor@email.com',
    phone: '+234 801 234 5678',
    property: '101 Adeola Odeku St',
    unit: 'Apt 3B',
    leaseStart: 'Jan 1, 2025',
    leaseEnd: 'Dec 31, 2025',
    rentAmount: 2500000,
    status: 'Active',
    daysUntilExpiry: 220,
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'm.johnson@email.com',
    phone: '+234 802 345 6789',
    property: 'Block 4, Admiralty Way',
    unit: 'Floor 2',
    leaseStart: 'Mar 1, 2025',
    leaseEnd: 'Feb 28, 2026',
    rentAmount: 3800000,
    status: 'Active',
    daysUntilExpiry: 370,
  },
  {
    id: '3',
    name: 'Amara Nwosu',
    email: 'amara.n@email.com',
    phone: '+234 803 456 7890',
    property: 'Glover Road, Ikoyi',
    unit: 'Suite A',
    leaseStart: 'Jun 1, 2024',
    leaseEnd: 'May 31, 2025',
    rentAmount: 1800000,
    status: 'Arrears',
    daysUntilExpiry: -25,
  },
  {
    id: '4',
    name: 'Chidi Eze',
    email: 'chidi.eze@email.com',
    phone: '+234 804 567 8901',
    property: '101 Adeola Odeku St',
    unit: 'Apt 1A',
    leaseStart: 'Jul 1, 2025',
    leaseEnd: 'Jun 30, 2026',
    rentAmount: 2200000,
    status: 'Pending Sign',
    daysUntilExpiry: 400,
  },
  {
    id: '5',
    name: 'Fatima Al-Hassan',
    email: 'fatima.h@email.com',
    phone: '+234 805 678 9012',
    property: 'Glover Road, Ikoyi',
    unit: 'Suite B',
    leaseStart: 'Feb 1, 2025',
    leaseEnd: 'Jan 31, 2026',
    rentAmount: 1900000,
    status: 'Active',
    daysUntilExpiry: 340,
  },
  {
    id: '6',
    name: 'Tunde Adeleke',
    email: 'tunde.a@email.com',
    phone: '+234 806 789 0123',
    property: 'Block 4, Admiralty Way',
    unit: 'Floor 3',
    leaseStart: 'Apr 1, 2024',
    leaseEnd: 'Mar 31, 2025',
    rentAmount: 3500000,
    status: 'Arrears',
    daysUntilExpiry: -60,
  },
  {
    id: '7',
    name: 'Ngozi Obi',
    email: 'ngozi.obi@email.com',
    phone: '+234 807 890 1234',
    property: '101 Adeola Odeku St',
    unit: 'Apt 2C',
    leaseStart: 'Aug 1, 2025',
    leaseEnd: 'Jul 31, 2026',
    rentAmount: 2400000,
    status: 'Pending Sign',
    daysUntilExpiry: 430,
  },
  {
    id: '8',
    name: 'Emeka Dibia',
    email: 'emeka.d@email.com',
    phone: '+234 808 901 2345',
    property: 'Glover Road, Ikoyi',
    unit: 'Suite C',
    leaseStart: 'Jan 1, 2025',
    leaseEnd: 'Dec 31, 2025',
    rentAmount: 2100000,
    status: 'Active',
    daysUntilExpiry: 220,
  },
  {
    id: '9',
    name: 'Blessing Musa',
    email: 'blessing.m@email.com',
    phone: '+234 809 012 3456',
    property: 'Block 4, Admiralty Way',
    unit: 'Floor 1',
    leaseStart: 'May 1, 2025',
    leaseEnd: 'Apr 30, 2026',
    rentAmount: 3600000,
    status: 'Active',
    daysUntilExpiry: 390,
  },
  {
    id: '10',
    name: 'Kemi Adesanya',
    email: 'kemi.a@email.com',
    phone: '+234 810 123 4567',
    property: '101 Adeola Odeku St',
    unit: 'Apt 4D',
    leaseStart: 'Mar 1, 2024',
    leaseEnd: 'Feb 28, 2025',
    rentAmount: 2300000,
    status: 'Arrears',
    daysUntilExpiry: -90,
  },
  {
    id: '11',
    name: 'Ibrahim Sule',
    email: 'ibrahim.s@email.com',
    phone: '+234 811 234 5678',
    property: 'Glover Road, Ikoyi',
    unit: 'Suite D',
    leaseStart: 'Jun 1, 2025',
    leaseEnd: 'May 31, 2026',
    rentAmount: 1950000,
    status: 'Active',
    daysUntilExpiry: 410,
  },
  {
    id: '12',
    name: 'Adaeze Nkem',
    email: 'adaeze.n@email.com',
    phone: '+234 812 345 6789',
    property: 'Block 4, Admiralty Way',
    unit: 'Penthouse',
    leaseStart: 'Sep 1, 2025',
    leaseEnd: 'Aug 31, 2026',
    rentAmount: 5500000,
    status: 'Pending Sign',
    daysUntilExpiry: 460,
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmount = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`;

const statusConfig: Record<
  LeaseStatus,
  { label: string; cls: string; dot: string }
> = {
  Active: {
    label: 'Active',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'Pending Sign': {
    label: 'Pending Sign',
    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  Arrears: {
    label: 'Arrears',
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-xs font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: LeaseStatus }) => {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon = ({
  field,
  sortField,
  sortDir,
}: {
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
}) => {
  if (sortField !== field)
    return <ChevronsUpDown size={13} className="text-slate-300" />;
  return sortDir === 'asc' ? (
    <ChevronUp size={13} className="text-blue-900" />
  ) : (
    <ChevronDown size={13} className="text-blue-900" />
  );
};

// ─── Table Header Cell ────────────────────────────────────────────────────────

const ThCell = ({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) => (
  <th
    className="px-5 py-3 text-left cursor-pointer select-none group"
    onClick={() => onSort(field)}
  >
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </div>
  </th>
);

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr className="border-b border-neutral-100 animate-pulse">
    {[40, 32, 24, 24, 20, 20].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className={`h-3 bg-slate-100 rounded-full w-${w}`} />
      </td>
    ))}
  </tr>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ query }: { query: string }) => (
  <tr>
    <td colSpan={6}>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <User size={28} className="text-slate-400" />
        </div>
        <p className="text-slate-700 font-bold text-base">
          {query ? `No tenants matching "${query}"` : 'No tenants yet'}
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {query
            ? 'Try a different search term'
            : 'Add your first tenant to get started'}
        </p>
      </div>
    </td>
  </tr>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | 'All'>('All');
  const [loading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let data = MOCK_TENANTS;
    if (search)
      data = data.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.property.toLowerCase().includes(search.toLowerCase()) ||
          t.email.toLowerCase().includes(search.toLowerCase()),
      );
    if (statusFilter !== 'All')
      data = data.filter((t) => t.status === statusFilter);
    data = [...data].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'property')
        cmp = a.property.localeCompare(b.property);
      else if (sortField === 'leaseStart')
        cmp = a.leaseStart.localeCompare(b.leaseStart);
      else if (sortField === 'leaseEnd')
        cmp = a.leaseEnd.localeCompare(b.leaseEnd);
      else if (sortField === 'rentAmount') cmp = a.rentAmount - b.rentAmount;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: MOCK_TENANTS.length,
    active: MOCK_TENANTS.filter((t) => t.status === 'Active').length,
    pending: MOCK_TENANTS.filter((t) => t.status === 'Pending Sign').length,
    arrears: MOCK_TENANTS.filter((t) => t.status === 'Arrears').length,
  };

  const toggleSelect = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const toggleAll = () =>
    setSelected((s) =>
      s.length === paginated.length ? [] : paginated.map((t) => t.id),
    );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
            Tenants
          </h1>
          <p className="text-sm text-blue-200/60 font-medium mt-1">
            Manage leases, track payments, and monitor tenant status
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600/50 border border-blue-500/30 text-white rounded-2xl px-6 py-3 text-xs font-bold hover:bg-blue-600 hover:border-blue-400 transition-all shadow-xl uppercase tracking-widest">
          <UserPlus size={16} />
          Invite Tenant
        </button>
      </div>

      {/* ── Stat Pills ── */}
      <div className="flex gap-4 flex-wrap">
        {[
          {
            label: 'Total Tenants',
            value: stats.total,
            icon: <User size={16} />,
            color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Active Leases',
            value: stats.active,
            icon: <Home size={16} />,
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Pending Sign',
            value: stats.pending,
            icon: <Calendar size={16} />,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          },
          {
            label: 'In Arrears',
            value: stats.arrears,
            icon: <DollarSign size={16} />,
            color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border text-[10px] font-bold uppercase tracking-widest ${color} shadow-sm backdrop-blur-sm`}
          >
            {icon}
            <span>
              {value} {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/5 flex-wrap">
          {/* Search */}
          <div className="relative group flex-1 min-w-[240px] max-w-sm">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
            />
            <input
              type="text"
              placeholder="Search by name, property, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-11 pr-4 py-3 text-xs font-bold bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-blue-300/20 outline-none focus:border-blue-500 focus:bg-white/10 transition-all uppercase tracking-widest"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Active', 'Pending Sign', 'Arrears'] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    statusFilter === s
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                      : 'bg-white/5 text-blue-200/40 border-white/5 hover:border-white/10 hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ),
            )}
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="text-[10px] font-bold uppercase tracking-widest border border-white/5 rounded-xl px-3 py-2 text-blue-200/40 bg-white/5 outline-none hover:border-white/10 transition-all flex item-center"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n} className="bg-slate-900 text-white">
                Show {n}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-blue-300/40">
                <th className="px-5 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selected.length === paginated.length &&
                      paginated.length > 0
                    }
                    onChange={toggleAll}
                    className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                  />
                </th>
                <ThCell
                  field="name"
                  label="Tenant"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <ThCell
                  field="property"
                  label="Property"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <ThCell
                  field="leaseStart"
                  label="Lease Start"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <ThCell
                  field="leaseEnd"
                  label="Lease End"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <ThCell
                  field="rentAmount"
                  label="Rent / yr"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <ThCell
                  field="status"
                  label="Status"
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <th className="px-5 py-3 text-[10px] font-bold text-blue-300/40 uppercase tracking-widest text-left">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <EmptyState query={search} />
              ) : (
                paginated.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-white/5 border-b border-white/5 transition-all group"
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(tenant.id)}
                        onChange={() => toggleSelect(tenant.id)}
                        className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                      />
                    </td>

                    {/* Tenant Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={tenant.name} />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                            {tenant.name}
                          </p>
                          <p className="text-xs text-blue-200/40">
                            {tenant.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Property */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-white font-medium">
                        {tenant.property}
                      </p>
                      <p className="text-xs text-blue-200/40">{tenant.unit}</p>
                    </td>

                    {/* Lease Start */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-blue-200/60 font-medium">
                        {tenant.leaseStart}
                      </span>
                    </td>

                    {/* Lease End */}
                    <td className="px-5 py-4">
                      <span
                        className={`text-sm font-bold ${tenant.daysUntilExpiry < 0 ? 'text-rose-400' : tenant.daysUntilExpiry < 60 ? 'text-amber-400' : 'text-blue-200'}`}
                      >
                        {tenant.leaseEnd}
                      </span>
                      {tenant.daysUntilExpiry < 0 && (
                        <p className="text-[10px] text-rose-500/60 font-bold uppercase tracking-widest mt-0.5">
                          Expired
                        </p>
                      )}
                      {tenant.daysUntilExpiry >= 0 &&
                        tenant.daysUntilExpiry < 60 && (
                          <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest mt-0.5">
                            Expiring soon
                          </p>
                        )}
                    </td>

                    {/* Rent */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        {fmtAmount(tenant.rentAmount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-blue-200/40 border border-white/5 rounded-xl px-4 py-2 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/5 flex-wrap gap-4">
          <p className="text-[10px] font-bold text-blue-300/40 uppercase tracking-widest">
            Showing{' '}
            <span className="text-white">
              {Math.min((page - 1) * pageSize + 1, filtered.length)}–
              {Math.min(page * pageSize, filtered.length)}
            </span>{' '}
            of <span className="text-white">{filtered.length}</span> tenants
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/5 rounded-xl text-blue-200/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-2 text-blue-300/20 text-xs"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[36px] h-9 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-all ${
                      page === p
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                        : 'border-white/5 text-blue-200/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-white/5 rounded-xl text-blue-200/40 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
