'use client';

import { useState, useMemo } from 'react';
import { Plus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { MfaDeviceList } from './MfaDeviceList';
import { MfaDeviceForm, type MfaDeviceFormValues } from './MfaDeviceForm';
import { MfaDeviceDetail } from './MfaDeviceDetail';

interface MfaDevice {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email' | 'webauthn';
  enabled: boolean;
  verified: boolean;
  createdAt: string;
  lastUsed?: string;
  backupCodes?: string[];
}

interface MfaDeviceManagementProps {
  userId: string;
}

export function MfaDeviceManagement({ userId }: MfaDeviceManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MfaDevice[]>([]);

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId],
  );

  const unverifiedCount = useMemo(
    () => devices.filter((d) => !d.verified).length,
    [devices],
  );

  const handleAddDevice = async (data: MfaDeviceFormValues) => {
    try {
      const newDevice: MfaDevice = {
        id: `device_${userId}_${Date.now()}`,
        ...data,
        enabled: true,
        verified: false,
        createdAt: new Date().toISOString(),
        backupCodes: generateBackupCodes(),
      };
      setDevices([...devices, newDevice]);
      toast.success('MFA device added. Please verify to complete setup.');
      setShowForm(false);
    } catch {
      toast.error('Failed to add MFA device');
    }
  };

  const handleVerifyDevice = async (id: string) => {
    try {
      setDevices(
        devices.map((d) => (d.id === id ? { ...d, verified: true } : d)),
      );
      toast.success('MFA device verified and enabled');
    } catch {
      toast.error('Failed to verify device');
    }
  };

  const handleRenameDevice = async (id: string, newName: string) => {
    try {
      setDevices(
        devices.map((d) => (d.id === id ? { ...d, name: newName } : d)),
      );
      toast.success('Device renamed successfully');
    } catch {
      toast.error('Failed to rename device');
    }
  };

  const handleToggleDevice = async (id: string) => {
    try {
      setDevices(
        devices.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)),
      );
      toast.success('Device status updated');
    } catch {
      toast.error('Failed to update device');
    }
  };

  const handleRemoveDevice = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this device? You will need to use another MFA method.',
      )
    ) {
      return;
    }

    try {
      setDevices(devices.filter((d) => d.id !== id));
      if (selectedDeviceId === id) setSelectedDeviceId(null);
      toast.success('MFA device removed');
    } catch {
      toast.error('Failed to remove device');
    }
  };

  const handleRegenerateBackupCodes = async (id: string) => {
    try {
      const newCodes = generateBackupCodes();
      setDevices(
        devices.map((d) => (d.id === id ? { ...d, backupCodes: newCodes } : d)),
      );
      toast.success('Backup codes regenerated');
    } catch {
      toast.error('Failed to regenerate backup codes');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-purple-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Shield size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              MFA Device Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Manage your multi-factor authentication devices.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          Add Device
        </button>
      </div>

      {unverifiedCount > 0 && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-amber-100">
          <p className="font-semibold">
            {unverifiedCount} unverified device
            {unverifiedCount !== 1 ? 's' : ''}
          </p>
          <p className="text-sm mt-1">
            Complete verification to enable these devices.
          </p>
        </div>
      )}

      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <MfaDeviceForm
            onSubmit={handleAddDevice}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Total Devices
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {devices.length}
          </h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Enabled
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {devices.filter((d) => d.enabled && d.verified).length}
          </h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Unverified
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {unverifiedCount}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <MfaDeviceList
            devices={devices}
            selectedId={selectedDeviceId}
            onSelect={setSelectedDeviceId}
            onToggle={handleToggleDevice}
            onRemove={handleRemoveDevice}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedDevice ? (
            <MfaDeviceDetail
              device={selectedDevice}
              onVerify={() => handleVerifyDevice(selectedDevice.id)}
              onRename={(newName) =>
                handleRenameDevice(selectedDevice.id, newName)
              }
              onRegenerateBackupCodes={() =>
                handleRegenerateBackupCodes(selectedDevice.id)
              }
            />
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">
                {devices.length === 0
                  ? 'Add a device to get started'
                  : 'Select a device to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}
