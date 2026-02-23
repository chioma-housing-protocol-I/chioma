"use client";

import { useState, useMemo } from "react";
import { User, Search, ChevronUp, ChevronDown, ChevronsUpDown, UserPlus, Home, Calendar, DollarSign } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaseStatus = "Active" | "Pending Sign" | "Arrears";
type SortField = "name" | "property" | "leaseStart" | "leaseEnd" | "rentAmount" | "status";
type SortDir = "asc" | "desc";

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
  { id: "1", name: "Sarah Okafor", email: "sarah.okafor@email.com", phone: "+234 801 234 5678", property: "101 Adeola Odeku St", unit: "Apt 3B", leaseStart: "Jan 1, 2025", leaseEnd: "Dec 31, 2025", rentAmount: 2500000, status: "Active", daysUntilExpiry: 220 },
  { id: "2", name: "Michael Johnson", email: "m.johnson@email.com", phone: "+234 802 345 6789", property: "Block 4, Admiralty Way", unit: "Floor 2", leaseStart: "Mar 1, 2025", leaseEnd: "Feb 28, 2026", rentAmount: 3800000, status: "Active", daysUntilExpiry: 370 },
  { id: "3", name: "Amara Nwosu", email: "amara.n@email.com", phone: "+234 803 456 7890", property: "Glover Road, Ikoyi", unit: "Suite A", leaseStart: "Jun 1, 2024", leaseEnd: "May 31, 2025", rentAmount: 1800000, status: "Arrears", daysUntilExpiry: -25 },
  { id: "4", name: "Chidi Eze", email: "chidi.eze@email.com", phone: "+234 804 567 8901", property: "101 Adeola Odeku St", unit: "Apt 1A", leaseStart: "Jul 1, 2025", leaseEnd: "Jun 30, 2026", rentAmount: 2200000, status: "Pending Sign", daysUntilExpiry: 400 },
  { id: "5", name: "Fatima Al-Hassan", email: "fatima.h@email.com", phone: "+234 805 678 9012", property: "Glover Road, Ikoyi", unit: "Suite B", leaseStart: "Feb 1, 2025", leaseEnd: "Jan 31, 2026", rentAmount: 1900000, status: "Active", daysUntilExpiry: 340 },
  { id: "6", name: "Tunde Adeleke", email: "tunde.a@email.com", phone: "+234 806 789 0123", property: "Block 4, Admiralty Way", unit: "Floor 3", leaseStart: "Apr 1, 2024", leaseEnd: "Mar 31, 2025", rentAmount: 3500000, status: "Arrears", daysUntilExpiry: -60 },
  { id: "7", name: "Ngozi Obi", email: "ngozi.obi@email.com", phone: "+234 807 890 1234", property: "101 Adeola Odeku St", unit: "Apt 2C", leaseStart: "Aug 1, 2025", leaseEnd: "Jul 31, 2026", rentAmount: 2400000, status: "Pending Sign", daysUntilExpiry: 430 },
  { id: "8", name: "Emeka Dibia", email: "emeka.d@email.com", phone: "+234 808 901 2345", property: "Glover Road, Ikoyi", unit: "Suite C", leaseStart: "Jan 1, 2025", leaseEnd: "Dec 31, 2025", rentAmount: 2100000, status: "Active", daysUntilExpiry: 220 },
  { id: "9", name: "Blessing Musa", email: "blessing.m@email.com", phone: "+234 809 012 3456", property: "Block 4, Admiralty Way", unit: "Floor 1", leaseStart: "May 1, 2025", leaseEnd: "Apr 30, 2026", rentAmount: 3600000, status: "Active", daysUntilExpiry: 390 },
  { id: "10", name: "Kemi Adesanya", email: "kemi.a@email.com", phone: "+234 810 123 4567", property: "101 Adeola Odeku St", unit: "Apt 4D", leaseStart: "Mar 1, 2024", leaseEnd: "Feb 28, 2025", rentAmount: 2300000, status: "Arrears", daysUntilExpiry: -90 },
  { id: "11", name: "Ibrahim Sule", email: "ibrahim.s@email.com", phone: "+234 811 234 5678", property: "Glover Road, Ikoyi", unit: "Suite D", leaseStart: "Jun 1, 2025", leaseEnd: "May 31, 2026", rentAmount: 1950000, status: "Active", daysUntilExpiry: 410 },
  { id: "12", name: "Adaeze Nkem", email: "adaeze.n@email.com", phone: "+234 812 345 6789", property: "Block 4, Admiralty Way", unit: "Penthouse", leaseStart: "Sep 1, 2025", leaseEnd: "Aug 31, 2026", rentAmount: 5500000, status: "Pending Sign", daysUntilExpiry: 460 },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmount = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`;

const statusConfig: Record<LeaseStatus, { label: string; cls: string; dot: string }> = {
  "Active":      { label: "Active",       cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  "Pending Sign":{ label: "Pending Sign", cls: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  "Arrears":     { label: "Arrears",      cls: "bg-rose-100 text-rose-700",        dot: "bg-rose-500"    },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: LeaseStatus }) => {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (sortField !== field) return <ChevronsUpDown size={13} className="text-slate-300" />;
  return sortDir === "asc" ? <ChevronUp size={13} className="text-blue-900" /> : <ChevronDown size={13} className="text-blue-900" />;
};

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
          {query ? `No tenants matching "${query}"` : "No tenants yet"}
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {query ? "Try a different search term" : "Add your first tenant to get started"}
        </p>
      </div>
    </td>
  </tr>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "All">("All");
  const [loading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let data = MOCK_TENANTS;
    if (search) data = data.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.property.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "All") data = data.filter(t => t.status === statusFilter);
    data = [...data].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "property") cmp = a.property.localeCompare(b.property);
      else if (sortField === "leaseStart") cmp = a.leaseStart.localeCompare(b.leaseStart);
      else if (sortField === "leaseEnd") cmp = a.leaseEnd.localeCompare(b.leaseEnd);
      else if (sortField === "rentAmount") cmp = a.rentAmount - b.rentAmount;
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [search, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = {
    total: MOCK_TENANTS.length,
    active: MOCK_TENANTS.filter(t => t.status === "Active").length,
    pending: MOCK_TENANTS.filter(t => t.status === "Pending Sign").length,
    arrears: MOCK_TENANTS.filter(t => t.status === "Arrears").length,
  };

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleAll = () =>
    setSelected(s => s.length === paginated.length ? [] : paginated.map(t => t.id));

  const ThCell = ({ field, label }: { field: SortField; label: string }) => (
    <th className="px-5 py-3 text-left cursor-pointer select-none group" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-900">Tenants</h1>
          <p className="text-sm text-slate-400 mt-1">Manage leases, track payments, and monitor tenant status</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-800 transition-colors shadow-sm">
          <UserPlus size={16} />
          Invite Tenant
        </button>
      </div>

      {/* ── Stat Pills ── */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Total Tenants", value: stats.total, icon: <User size={14} />, color: "text-blue-900 bg-blue-50 border-blue-200" },
          { label: "Active Leases", value: stats.active, icon: <Home size={14} />, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "Pending Sign", value: stats.pending, icon: <Calendar size={14} />, color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "In Arrears", value: stats.arrears, icon: <DollarSign size={14} />, color: "text-rose-700 bg-rose-50 border-rose-200" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${color}`}>
            {icon}
            <span>{value} {label}</span>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, property, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-300 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["All", "Active", "Pending Sign", "Arrears"] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  statusFilter === s
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-500 bg-slate-50 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>Show {n}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                  />
                </th>
                <ThCell field="name" label="Tenant" />
                <ThCell field="property" label="Property" />
                <ThCell field="leaseStart" label="Lease Start" />
                <ThCell field="leaseEnd" label="Lease End" />
                <ThCell field="rentAmount" label="Rent / yr" />
                <ThCell field="status" label="Status" />
                <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : paginated.length === 0
                ? <EmptyState query={search} />
                : paginated.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-neutral-50 border-b border-neutral-100 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(tenant.id)}
                        onChange={() => toggleSelect(tenant.id)}
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                      />
                    </td>

                    {/* Tenant Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={tenant.name} />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{tenant.name}</p>
                          <p className="text-xs text-slate-400">{tenant.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Property */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700 font-medium">{tenant.property}</p>
                      <p className="text-xs text-slate-400">{tenant.unit}</p>
                    </td>

                    {/* Lease Start */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-600">{tenant.leaseStart}</span>
                    </td>

                    {/* Lease End */}
                    <td className="px-5 py-4">
                      <span className={`text-sm font-medium ${tenant.daysUntilExpiry < 0 ? "text-rose-600" : tenant.daysUntilExpiry < 60 ? "text-amber-600" : "text-slate-600"}`}>
                        {tenant.leaseEnd}
                      </span>
                      {tenant.daysUntilExpiry < 0 && (
                        <p className="text-[10px] text-rose-500 font-semibold">Expired</p>
                      )}
                      {tenant.daysUntilExpiry >= 0 && tenant.daysUntilExpiry < 60 && (
                        <p className="text-[10px] text-amber-500 font-semibold">Expiring soon</p>
                      )}
                    </td>

                    {/* Rent */}
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-emerald-600">{fmtAmount(tenant.rentAmount)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4">
                      <button className="text-xs font-semibold text-blue-900 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50 flex-wrap gap-3">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)}</span> of <span className="font-semibold text-slate-600">{filtered.length}</span> tenants
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      page === p
                        ? "bg-blue-900 text-white border-blue-900"
                        : "border-slate-200 text-slate-500 hover:bg-white"
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
