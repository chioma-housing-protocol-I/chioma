'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  ChevronDown,
} from 'lucide-react';
import {
  checkNetworkConfig,
  checkAppUrls,
  checkRpcAndContracts,
} from '@/lib/config/rpc-urls';

type CheckStatus = 'pass' | 'warn' | 'fail';

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass')
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'warn')
    return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

function statusColor(status: CheckStatus): string {
  if (status === 'pass') return 'border-emerald-400/20 bg-emerald-500/10';
  if (status === 'warn') return 'border-amber-400/20 bg-amber-500/10';
  return 'border-red-400/20 bg-red-500/10';
}

function statusBadge(status: CheckStatus): { label: string; cls: string } {
  if (status === 'pass')
    return {
      label: 'Pass',
      cls: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    };
  if (status === 'warn')
    return {
      label: 'Warn',
      cls: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
    };
  return {
    label: 'Fail',
    cls: 'border-red-400/20 bg-red-500/10 text-red-300',
  };
}

export default function EnvSelfCheck() {
  const [open, setOpen] = useState(false);

  const networkChecks = checkNetworkConfig();
  const appUrlChecks = checkAppUrls();
  const rpcChecks = checkRpcAndContracts();

  const allChecks = [...networkChecks, ...appUrlChecks, ...rpcChecks];
  const hasFail = allChecks.some((c) => c.status === 'fail');
  const hasWarn = allChecks.some((c) => c.status === 'warn');

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-blue-300" />
          <h3 className="text-lg font-semibold text-white">
            Frontend Environment Self-Check
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase tracking-wide ${
              hasFail
                ? 'border-red-400/20 bg-red-500/10 text-red-300'
                : hasWarn
                  ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {hasFail
              ? 'Issues found'
              : hasWarn
                ? 'Warnings'
                : 'All checks passed'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
        >
          {open ? 'Hide' : 'Show'} details
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div className="space-y-2">
          {allChecks.map((check, i) => {
            const badge = statusBadge(check.status);
            return (
              <div
                key={`${check.label}-${i}`}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${statusColor(check.status)}`}
              >
                <StatusIcon status={check.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {check.label}
                    </p>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {check.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Read-only diagnostic. Does not expose secrets or private env values.
      </p>
    </section>
  );
}
