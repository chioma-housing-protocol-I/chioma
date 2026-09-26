'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { onStatusChange } from '@/lib/websocket/manager';
import { useAuthStore } from '@/store/authStore';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; icon: typeof Wifi; bg: string; text: string; show: boolean }
> = {
  connected: {
    label: 'Connected',
    icon: Wifi,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    show: false,
  },
  connecting: {
    label: 'Reconnecting…',
    icon: Loader2,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    show: true,
  },
  disconnected: {
    label: 'Offline — some features may be unavailable',
    icon: WifiOff,
    bg: 'bg-red-50',
    text: 'text-red-700',
    show: true,
  },
};

export function ConnectionStatusBanner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = onStatusChange(setStatus);
    return unsub;
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const config = STATUS_CONFIG[status];
  if (!config.show) return null;

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium ${config.bg} ${config.text} border-b transition-colors`}
      role="status"
      aria-live="polite"
    >
      <Icon
        size={13}
        className={status === 'connecting' ? 'animate-spin' : ''}
      />
      <span>{config.label}</span>
    </div>
  );
}
