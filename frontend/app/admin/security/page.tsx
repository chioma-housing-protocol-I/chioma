'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, RefreshCw, Search, Shield, Siren } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/authStore';
import { SecurityEventList } from '@/components/admin/SecurityEventList';
import { SecurityEventStats } from '@/components/admin/SecurityEventStats';
import { SecurityEventTimeline } from '@/components/admin/SecurityEventTimeline';
import { SecurityEventDetail } from '@/components/admin/SecurityEventDetail';
import type { SecurityResponseLogEntry } from '@/components/admin/SecurityEventActions';
import {
  buildSecurityDashboardSummary,
  filterSecurityFeed,
  normalizeSecurityFeed,
  type DashboardItemKind,
  type DashboardSeverity,
  type SecurityFeedItem,
} from '@/lib/security-dashboard';
import {
  fetchSecurityIncidentReport,
  useIncidentMetrics,
  useMarkThreatFalsePositive,
  useResolveSecurityIncident,
  useSecurityEvents,
  useSecurityIncidents,
  useThreats,
  useThreatStats,
} from '@/lib/query/hooks/use-security-dashboard';

const RESPONSE_LOG_STORAGE_KEY = 'chioma-admin-security-response-log';

type SeverityFilter = DashboardSeverity | 'all';
type KindFilter = DashboardItemKind | 'all';
type ResponseLogMap = Record<string, SecurityResponseLogEntry[]>;

function getResponseLogKey(item: SecurityFeedItem): string {
  return `${item.kind}:${item.id}`;
}

export default function SecurityDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hours, setHours] = useState(72);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [onlyActionable, setOnlyActionable] = useState(false);
  const [selected, setSelected] = useState<SecurityFeedItem | null>(null);
  const [incidentReport, setIncidentReport] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [responseLog, setResponseLog] = useState<ResponseLogMap>({});
  const [reportLoading, setReportLoading] = useState(false);

  const eventsQuery = useSecurityEvents({ hours, limit: 180 });
  const threatsQuery = useThreats({ limit: 80 });
  const threatStatsQuery = useThreatStats({ hours });
  const incidentsQuery = useSecurityIncidents();
  const incidentMetricsQuery = useIncidentMetrics();

  const markFalsePositive = useMarkThreatFalsePositive();
  const resolveIncident = useResolveSecurityIncident();

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.replace('/landlords');
    }
  }, [authLoading, router, user?.role]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = localStorage.getItem(RESPONSE_LOG_STORAGE_KEY);
      if (raw) {
        setResponseLog(JSON.parse(raw) as ResponseLogMap);
      }
    } catch {
      setResponseLog({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(RESPONSE_LOG_STORAGE_KEY, JSON.stringify(responseLog));
  }, [responseLog]);

  const feed = useMemo(() => {
    return normalizeSecurityFeed(
      eventsQuery.data ?? [],
      threatsQuery.data ?? [],
      incidentsQuery.data ?? [],
    );
  }, [eventsQuery.data, threatsQuery.data, incidentsQuery.data]);

  const filteredFeed = useMemo(() => {
    return filterSecurityFeed(feed, {
      search,
      severity,
      kind,
      onlyActionable,
    });
  }, [feed, kind, onlyActionable, search, severity]);

  useEffect(() => {
    if (filteredFeed.length === 0) {
      setSelected(null);
      setIncidentReport(null);
      return;
    }

    if (selected && !filteredFeed.some((item) => item.id === selected.id)) {
      setSelected(null);
      setIncidentReport(null);
    }
  }, [filteredFeed, selected]);

  const summary = useMemo(() => {
    return buildSecurityDashboardSummary(
      filteredFeed,
      threatStatsQuery.data ?? null,
      incidentMetricsQuery.data ?? null,
    );
  }, [filteredFeed, incidentMetricsQuery.data, threatStatsQuery.data]);

  const currentEntries = selected
    ? (responseLog[getResponseLogKey(selected)] ?? [])
    : [];

  const lastUpdatedAt = useMemo(() => {
    const timestamps = [
      eventsQuery.dataUpdatedAt,
      threatsQuery.dataUpdatedAt,
      threatStatsQuery.dataUpdatedAt,
      incidentsQuery.dataUpdatedAt,
      incidentMetricsQuery.dataUpdatedAt,
    ].filter((value): value is number => value > 0);

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toISOString();
  }, [
    eventsQuery.dataUpdatedAt,
    threatsQuery.dataUpdatedAt,
    threatStatsQuery.dataUpdatedAt,
    incidentsQuery.dataUpdatedAt,
    incidentMetricsQuery.dataUpdatedAt,
  ]);

  const isLoading =
    eventsQuery.isLoading ||
    threatsQuery.isLoading ||
    threatStatsQuery.isLoading ||
    incidentsQuery.isLoading ||
    incidentMetricsQuery.isLoading;

  const combinedError =
    eventsQuery.error ||
    threatsQuery.error ||
    threatStatsQuery.error ||
    incidentsQuery.error ||
    incidentMetricsQuery.error;

  const isMutating =
    markFalsePositive.isPending || resolveIncident.isPending || reportLoading;

  const appendResponseEntry = (label: string, note?: string) => {
    if (!selected) {
      return;
    }

    const nextEntry: SecurityResponseLogEntry = {
      label,
      note,
      timestamp: new Date().toISOString(),
    };
    const key = getResponseLogKey(selected);

    setResponseLog((prev) => ({
      ...prev,
      [key]: [nextEntry, ...(prev[key] ?? [])],
    }));
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        eventsQuery.refetch(),
        threatsQuery.refetch(),
        threatStatsQuery.refetch(),
        incidentsQuery.refetch(),
        incidentMetricsQuery.refetch(),
      ]);
      toast.success('Security dashboard refreshed');
    } catch {
      toast.error('Refresh failed. Please retry.');
    }
  };

  const handleMarkFalsePositive = async () => {
    if (!selected || selected.kind !== 'threat') {
      return;
    }

    try {
      await markFalsePositive.mutateAsync(selected.id);
      appendResponseEntry('Marked false positive');
      toast.success('Threat marked as false positive');
    } catch {
      toast.error('Could not update threat status');
    }
  };

  const handleResolveIncident = async (resolution: string) => {
    if (!selected || selected.kind !== 'incident') {
      return;
    }

    try {
      await resolveIncident.mutateAsync({
        incidentId: selected.id,
        resolution,
      });
      appendResponseEntry('Resolved incident', resolution);
      toast.success('Incident resolved');
    } catch {
      toast.error('Could not resolve incident');
    }
  };

  const handleGenerateReport = async () => {
    if (!selected || selected.kind !== 'incident') {
      appendResponseEntry('Generated response notes');
      return;
    }

    try {
      setReportLoading(true);
      const report = await fetchSecurityIncidentReport(selected.id);
      setIncidentReport(report);
      appendResponseEntry('Generated incident report');
      toast.success('Incident report loaded');
    } catch {
      toast.error('Could not generate incident report');
    } finally {
      setReportLoading(false);
    }
  };

  if (authLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Security Dashboard
        </h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-200/80">
          Verifying access...
        </div>
      </section>
    );
  }

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-blue-300">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Security Events Dashboard
              </h1>
              <p className="text-sm text-blue-200/60">
                Monitor threat signals, incident response, and event activity in
                near real time.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-200/45">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
              Live polling every 15s
            </span>
            {lastUpdatedAt && (
              <span>
                Last update {new Date(lastUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={() => void handleRefresh()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300/40" />
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none"
            placeholder="Search user, IP, description, or signal type"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          value={hours}
          onChange={(event) => setHours(Number(event.target.value))}
        >
          <option value={24}>Last 24 hours</option>
          <option value={72}>Last 72 hours</option>
          <option value={168}>Last 7 days</option>
        </select>

        <select
          className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
          value={severity}
          onChange={(event) =>
            setSeverity(event.target.value as SeverityFilter)
          }
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Actionable only</p>
            <p className="text-xs text-blue-200/45">Hide informational items</p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 accent-blue-500"
            checked={onlyActionable}
            onChange={(event) => setOnlyActionable(event.target.checked)}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 xl:col-span-4">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { label: 'All signals', value: 'all' },
                { label: 'Events', value: 'event' },
                { label: 'Threats', value: 'threat' },
                { label: 'Incidents', value: 'incident' },
              ] as Array<{ label: string; value: KindFilter }>
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                  kind === option.value
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                    : 'border-white/10 bg-white/5 text-blue-200/60 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setKind(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {combinedError && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Failed to load one or more security feeds. The dashboard is showing
          whatever data could still be fetched.
        </div>
      )}

      <SecurityEventStats
        summary={summary}
        threatStats={threatStatsQuery.data ?? null}
        incidentMetrics={incidentMetricsQuery.data ?? null}
        lastUpdatedAt={lastUpdatedAt}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SecurityEventList
          items={filteredFeed}
          loading={isLoading}
          selectedId={selected?.id ?? null}
          onSelect={(item) => {
            setSelected(item);
            setIncidentReport(null);
          }}
        />
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Alert Management
                </h3>
                <p className="text-sm text-blue-200/55">
                  Current incident and response posture.
                </p>
              </div>
              <Siren className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  Open Incidents
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {incidentMetricsQuery.data?.openIncidents ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/45">
                  Auto-Mitigation
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {threatStatsQuery.data?.autoMitigated ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-300" />
                <p className="text-sm font-medium text-white">
                  Response Tracking
                </p>
              </div>
              <p className="mt-2 text-sm text-blue-200/55">
                {selected
                  ? `${currentEntries.length} analyst actions logged for the selected signal.`
                  : 'Select a signal to review or log analyst actions.'}
              </p>
            </div>
          </div>

          <SecurityEventTimeline
            items={filteredFeed}
            onSelect={(item) => {
              setSelected(item);
              setIncidentReport(null);
            }}
          />
        </div>
      </div>

      <SecurityEventDetail
        item={selected}
        entries={currentEntries}
        incidentReport={incidentReport}
        isMutating={isMutating}
        onClose={() => {
          setSelected(null);
          setIncidentReport(null);
        }}
        onTrackAction={(label, note) => {
          appendResponseEntry(label, note);
          toast.success(`${label} logged`);
        }}
        onMarkFalsePositive={handleMarkFalsePositive}
        onResolveIncident={handleResolveIncident}
        onGenerateReport={handleGenerateReport}
      />
    </section>
  );
}
