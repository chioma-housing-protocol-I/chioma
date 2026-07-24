'use client';

import EnvSelfCheck from '@/components/developer/EnvSelfCheck';
import { CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react';

const SERVICES = [
  {
    id: 'api',
    name: 'Core API',
    uptime: '99.98%',
    status: 'operational',
    latency: '42ms',
    incident: null,
  },
  {
    id: 'stellar',
    name: 'Stellar Network Relay',
    uptime: '99.95%',
    status: 'operational',
    latency: '61ms',
    incident: null,
  },
  {
    id: 'payments',
    name: 'Payment Processing',
    uptime: '99.97%',
    status: 'operational',
    latency: '55ms',
    incident: null,
  },
  {
    id: 'webhooks',
    name: 'Webhook Delivery',
    uptime: '99.90%',
    status: 'degraded',
    latency: '340ms',
    incident: 'Elevated delivery latency under investigation.',
  },
  {
    id: 'auth',
    name: 'Authentication Service',
    uptime: '100%',
    status: 'operational',
    latency: '28ms',
    incident: null,
  },
  {
    id: 'listings',
    name: 'Property Listings CDN',
    uptime: '99.99%',
    status: 'operational',
    latency: '18ms',
    incident: null,
  },
];

const INCIDENTS = [
  {
    id: 'inc_1',
    date: '2026-03-29',
    title: 'Webhook delivery latency elevated',
    status: 'investigating',
    updates: [
      {
        time: '19:42 UTC',
        message:
          'Investigating elevated latency on webhook delivery workers. Payments unaffected.',
      },
      {
        time: '19:15 UTC',
        message:
          'We are aware of elevated latency on the webhooks service and are investigating.',
      },
    ],
  },
  {
    id: 'inc_2',
    date: '2026-03-21',
    title: 'Stellar RPC timeout spikes (resolved)',
    status: 'resolved',
    updates: [
      {
        time: '14:00 UTC',
        message:
          'Root cause identified — upstream Stellar Horizon node timeout. Switched RPC endpoint. All metrics normal.',
      },
      {
        time: '12:30 UTC',
        message: 'Investigating increased latency on Stellar Network relay.',
      },
    ],
  },
];

const statusConfig = {
  operational: {
    label: 'Operational',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-400/20',
    dot: 'bg-amber-400 animate-pulse',
  },
  outage: {
    label: 'Outage',
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-400/20',
    dot: 'bg-red-400 animate-pulse',
  },
};

const incidentStatusConfig = {
  investigating: 'bg-amber-500/15 text-amber-400 border-amber-400/20',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/20',
};

export default function ApiStatusPage() {
  const hasIncident = SERVICES.some((s) => s.status !== 'operational');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">API Status</h2>
          <p className="text-blue-200/60 text-sm mt-1">
            Live uptime metrics and incident history for all Chioma services.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${hasIncident ? statusConfig.degraded.bg + ' ' + statusConfig.degraded.color : statusConfig.operational.bg + ' ' + statusConfig.operational.color}`}
        >
          <Activity size={15} />
          {hasIncident ? 'Partial Outage' : 'All Systems Operational'}
        </div>
      </div>

      <EnvSelfCheck />

      {/* Services grid */}
      <div className="space-y-3">
        {SERVICES.map((service) => {
          const cfg = statusConfig[service.status as keyof typeof statusConfig];
          const Icon = cfg.icon;
          return (
            <div
              key={service.id}
              id={`dev-status-${service.id}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 rounded-2xl bg-white/5 border border-white/10 px-6 py-4"
            >
              <div className="flex items-center gap-3 flex-1">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
                />
                <span className="text-sm font-semibold text-white">
                  {service.name}
                </span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 text-xs ml-5 sm:ml-0">
                <div className="text-center">
                  <span className="block text-blue-300/40 mb-0.5">
                    30-day uptime
                  </span>
                  <span className="font-semibold text-white">
                    {service.uptime}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-blue-300/40 mb-0.5">Latency</span>
                  <span className="font-semibold text-white">
                    {service.latency}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}
                >
                  <Icon size={12} />
                  <span className="text-[11px] font-semibold">{cfg.label}</span>
                </div>
              </div>

              {service.incident && (
                <p className="text-amber-200/70 text-xs ml-5 sm:ml-0 sm:max-w-xs">
                  {service.incident}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Incidents */}
      <div>
        <h3 className="text-xs font-semibold text-blue-300/50 uppercase tracking-widest mb-4">
          Recent Incidents
        </h3>
        <div className="space-y-4">
          {INCIDENTS.map((inc) => (
            <div
              key={inc.id}
              id={`dev-incident-${inc.id}`}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {inc.title}
                  </h4>
                  <p className="text-blue-300/40 text-xs mt-0.5">{inc.date}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${incidentStatusConfig[inc.status as keyof typeof incidentStatusConfig]}`}
                >
                  {inc.status}
                </span>
              </div>
              <div className="space-y-2 border-l-2 border-white/10 pl-4">
                {inc.updates.map((u, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="flex-shrink-0 flex items-center gap-1 text-blue-300/40 text-[11px] font-mono">
                      <Clock size={11} />
                      {u.time}
                    </span>
                    <p className="text-blue-200/70 text-xs">{u.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
