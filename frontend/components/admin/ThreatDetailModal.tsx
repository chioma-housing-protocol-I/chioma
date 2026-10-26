'use client';

import React, { useRef } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  History,
  Globe,
  ExternalLink,
  Code,
  Fingerprint,
} from 'lucide-react';
import { ThreatEvent, ThreatLevel, ThreatStatus } from '@/types/security';
import { useModalKeyboardNavigation } from '@/hooks/useModalKeyboardNavigation';

interface ThreatDetailModalProps {
  threat: ThreatEvent | null;
  onClose: () => void;
}

export function ThreatDetailModal({ threat, onClose }: ThreatDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalKeyboardNavigation(modalRef, onClose, threat !== null);

  if (!threat) return null;

  const getLevelColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.CRITICAL:
        return 'text-rose-500 bg-rose-500/10';
      case ThreatLevel.HIGH:
        return 'text-orange-500 bg-orange-500/10';
      case ThreatLevel.MEDIUM:
        return 'text-amber-500 bg-amber-500/10';
      case ThreatLevel.LOW:
        return 'text-emerald-500 bg-emerald-500/10';
      default:
        return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0f172a] p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full bg-white/5 p-2 text-blue-200/40 hover:bg-white/10 hover:text-white transition-all"
        >
          <X size={20} />
        </button>

        <header className="flex items-start gap-4 mb-8">
          <div
            className={`p-3 rounded-2xl ${getLevelColor(threat.threatLevel)}`}
          >
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">
              {threat.threatType.replace(/_/g, ' ')}
            </h2>
            <p className="text-blue-200/50 text-sm">Threat ID: {threat.id}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <DetailItem
              icon={<History size={16} />}
              label="Detected At"
              value={new Date(threat.createdAt).toLocaleString()}
            />
            <DetailItem
              icon={<Globe size={16} />}
              label="IP Address"
              value={threat.ipAddress || 'Unknown'}
            />
            <DetailItem
              icon={<ExternalLink size={16} />}
              label="Request Path"
              value={threat.requestPath || '/'}
            />
            <DetailItem
              icon={<Fingerprint size={16} />}
              label="User ID"
              value={threat.userId || 'Anonymous'}
            />
          </div>
          <div className="space-y-4">
            <DetailItem
              icon={<Shield size={16} />}
              label="Severity"
              value={
                <span
                  className={`uppercase font-bold ${getLevelColor(threat.threatLevel).split(' ')[0]}`}
                >
                  {threat.threatLevel}
                </span>
              }
            />
            <DetailItem
              icon={<Activity size={16} />}
              label="Status"
              value={<span className="capitalize">{threat.status}</span>}
            />
            <DetailItem
              icon={<ShieldCheck size={16} />}
              label="Auto-Mitigated"
              value={threat.autoMitigated ? 'Yes' : 'No'}
            />
            <DetailItem
              icon={<Shield size={16} />}
              label="Blocked"
              value={threat.blocked ? 'Yes' : 'No'}
            />
          </div>
        </div>

        <section className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-blue-200/70 mb-2 flex items-center gap-2">
            <Code size={16} /> Evidence & Details
          </h3>
          <p className="text-sm text-blue-100/80 mb-4">{threat.description}</p>
          <pre className="max-h-60 overflow-auto rounded-xl bg-black/40 p-4 text-xs font-mono text-emerald-400">
            {JSON.stringify(threat.evidence, null, 2)}
          </pre>
        </section>

        <footer className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-all"
          >
            Close
          </button>
          {threat.status === ThreatStatus.DETECTED && (
            <button className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
              Start Investigation
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-blue-200/40">{icon}</div>
      <div>
        <p className="text-xs text-blue-200/40 font-medium pb-0.5">{label}</p>
        <div className="text-sm text-blue-100/90 font-medium">{value}</div>
      </div>
    </div>
  );
}

function Activity(props: Record<string, unknown>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
