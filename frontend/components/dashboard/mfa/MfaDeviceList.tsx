'use client';

import { useMemo, useState } from 'react';
import { Search, Power, Trash2, AlertCircle, CheckCircle } from 'lucide-react';

interface MfaDevice {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email' | 'webauthn';
  enabled: boolean;
  verified: boolean;
  createdAt: string;
  lastUsed?: string;
}

interface MfaDeviceListProps {
  devices: MfaDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const DEVICE_ICONS: Record<string, string> = {
  totp: '🔐',
  sms: '📱',
  email: '📧',
  webauthn: '🔑',
};

const DEVICE_NAMES: Record<string, string> = {
  totp: 'Authenticator App',
  sms: 'SMS',
  email: 'Email',
  webauthn: 'Security Key',
};

export function MfaDeviceList({
  devices,
  selectedId,
  onSelect,
  onToggle,
  onRemove,
}: MfaDeviceListProps) {
  const [search, setSearch] = useState('');

  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return devices.filter(
      (device) =>
        normalizedSearch.length === 0 ||
        device.name.toLowerCase().includes(normalizedSearch) ||
        DEVICE_NAMES[device.type].toLowerCase().includes(normalizedSearch),
    );
  }, [search, devices]);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4 sticky top-6">
      <h2 className="text-lg font-bold text-white">Your Devices</h2>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
          size={16}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search devices..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
        />
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">
          No devices added yet
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">
          No matching devices
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredDevices.map((device) => {
            const isSelected = selectedId === device.id;

            return (
              <button
                key={device.id}
                onClick={() => onSelect(device.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'bg-purple-500/10 border-purple-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{DEVICE_ICONS[device.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">
                        {device.name}
                      </p>
                      <p className="text-xs text-blue-200/60 mt-0.5">
                        {DEVICE_NAMES[device.type]}
                      </p>
                    </div>
                  </div>
                  {device.verified && (
                    <CheckCircle
                      size={16}
                      className="text-emerald-400 flex-shrink-0"
                    />
                  )}
                  {!device.verified && (
                    <AlertCircle
                      size={16}
                      className="text-amber-400 flex-shrink-0"
                    />
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(device.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all text-sm ${
                      device.enabled && device.verified
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border border-white/10 text-blue-200/60'
                    }`}
                    title={device.enabled ? 'Disable' : 'Enable'}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(device.id);
                    }}
                    className="p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all text-sm"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
