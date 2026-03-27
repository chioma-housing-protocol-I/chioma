'use client';

import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TimerReset,
} from 'lucide-react';
import type {
  IncidentMetricsRecord,
  SecurityDashboardSummary,
  ThreatStatsRecord,
} from '@/lib/security-dashboard';

interface SecurityEventStatsProps {
  summary: SecurityDashboardSummary;
  threatStats: ThreatStatsRecord | null;
  incidentMetrics: IncidentMetricsRecord | null;
  lastUpdatedAt: string | null;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200/50">
            {title}
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-blue-200/60">{subtitle}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${tone}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SecurityEventStats({
  summary,
  threatStats,
  incidentMetrics,
  lastUpdatedAt,
}: SecurityEventStatsProps) {
  const severityEntries = [
    {
      label: 'Critical',
      value: summary.severityCounts.critical,
      tone: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      barTone: 'bg-rose-400',
    },
    {
      label: 'High',
      value: summary.severityCounts.high,
      tone: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      barTone: 'bg-amber-400',
    },
    {
      label: 'Medium',
      value: summary.severityCounts.medium,
      tone: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      barTone: 'bg-blue-400',
    },
    {
      label: 'Low',
      value: summary.severityCounts.low,
      tone: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      barTone: 'bg-emerald-400',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Signals"
          value={summary.totalSignals}
          subtitle="Combined events, threats, and incidents in scope"
          icon={<ShieldCheck size={22} className="text-blue-300" />}
          tone="bg-blue-500/10 text-blue-300 border-blue-500/20"
        />
        <StatCard
          title="Actionable"
          value={summary.criticalSignals}
          subtitle="High and critical items that need attention"
          icon={<ShieldAlert size={22} className="text-rose-300" />}
          tone="bg-rose-500/10 text-rose-300 border-rose-500/20"
        />
        <StatCard
          title="Open Incidents"
          value={summary.openIncidents}
          subtitle={`P1: ${incidentMetrics?.p1Count ?? 0} | P2: ${incidentMetrics?.p2Count ?? 0}`}
          icon={<Siren size={22} className="text-amber-300" />}
          tone="bg-amber-500/10 text-amber-300 border-amber-500/20"
        />
        <StatCard
          title="Blocked Threats"
          value={summary.blockedThreats}
          subtitle={`${summary.autoMitigatedThreats} auto-mitigated in current view`}
          icon={<AlertTriangle size={22} className="text-orange-300" />}
          tone="bg-orange-500/10 text-orange-300 border-orange-500/20"
        />
        <StatCard
          title="Response SLA"
          value={`${summary.responseSla}%`}
          subtitle={`Avg resolution: ${incidentMetrics?.avgResolutionMinutes ?? 0} min`}
          icon={<TimerReset size={22} className="text-emerald-300" />}
          tone="bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Severity Distribution
              </h3>
              <p className="text-sm text-blue-200/55">
                See where the current load is concentrated.
              </p>
            </div>
            {lastUpdatedAt && (
              <span className="text-xs text-blue-200/45">
                Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            {severityEntries.map((entry) => {
              const percentage =
                summary.totalSignals === 0
                  ? 0
                  : Math.round((entry.value / summary.totalSignals) * 100);

              return (
                <div key={entry.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{entry.label}</span>
                    <span className="text-blue-200/60">
                      {entry.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/30">
                    <div
                      className={`h-2 rounded-full ${entry.barTone}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Top Signal Types
              </h3>
              <p className="text-sm text-blue-200/55">
                Most frequent activity patterns in the current window.
              </p>
            </div>
            <span className="text-xs text-blue-200/45">
              Threat total: {threatStats?.total ?? 0}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {summary.typeCounts.length === 0 ? (
              <span className="text-sm text-blue-200/55">
                No security signals found for the selected range.
              </span>
            ) : (
              summary.typeCounts.map((entry) => (
                <div
                  key={entry.key}
                  className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200/45">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {entry.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
