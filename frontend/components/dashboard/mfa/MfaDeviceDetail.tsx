'use client';

import { useState } from 'react';
import {
  Edit2,
  Copy,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface MfaDeviceDetailProps {
  device: MfaDevice;
  onVerify: () => void;
  onRename: (newName: string) => void;
  onRegenerateBackupCodes: () => void;
}

const DEVICE_NAMES: Record<string, string> = {
  totp: 'Authenticator App',
  sms: 'SMS',
  email: 'Email',
  webauthn: 'Security Key',
};

export function MfaDeviceDetail({
  device,
  onVerify,
  onRename,
  onRegenerateBackupCodes,
}: MfaDeviceDetailProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(device.name);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationForm, setShowVerificationForm] = useState(
    !device.verified,
  );

  const createdDate = new Date(device.createdAt);
  const lastUsedDate = device.lastUsed ? new Date(device.lastUsed) : null;

  const handleSaveRename = () => {
    if (newName.trim() && newName !== device.name) {
      onRename(newName);
      setIsRenaming(false);
    }
  };

  const copyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const downloadBackupCodes = () => {
    if (!device.backupCodes) return;

    const text = `MFA Backup Codes for ${device.name}\nGenerated: ${new Date().toLocaleString()}\n\n${device.backupCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${device.id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  const handleVerify = () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter a verification code');
      return;
    }

    // In a real implementation, this would verify the code
    onVerify();
    setShowVerificationForm(false);
    setVerificationCode('');
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {isRenaming ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:bg-white/10 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleSaveRename}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsRenaming(false);
                  setNewName(device.name);
                }}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{device.name}</h2>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="p-2 text-blue-200/60 hover:text-white transition-colors"
                  title="Rename"
                >
                  <Edit2 size={16} />
                </button>
              </div>
              <p className="text-blue-200/60 mt-1">
                {DEVICE_NAMES[device.type]}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {device.verified ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">
                Verified
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertCircle size={16} className="text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                Unverified
              </span>
            </div>
          )}
        </div>
      </div>

      {showVerificationForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Enter Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 font-mono text-lg tracking-widest"
            />
          </div>
          <button
            onClick={handleVerify}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all"
          >
            Verify Device
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wide">
            Created
          </p>
          <p className="text-sm text-white mt-2">
            {createdDate.toLocaleString()}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wide">
            Last Used
          </p>
          <p className="text-sm text-white mt-2">
            {lastUsedDate ? lastUsedDate.toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {device.backupCodes && device.backupCodes.length > 0 && (
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="font-semibold text-white">Backup Codes</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="text-sm text-purple-400 hover:text-purple-300 font-medium"
              >
                {showBackupCodes ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={downloadBackupCodes}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Download size={14} />
                Download
              </button>
              <button
                onClick={onRegenerateBackupCodes}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
            </div>
          </div>

          {showBackupCodes && (
            <div className="grid grid-cols-2 gap-2">
              {device.backupCodes.map((code, index) => (
                <button
                  key={index}
                  onClick={() => copyBackupCode(code)}
                  className="group relative px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-left hover:border-white/20 transition-all"
                >
                  <code className="text-xs text-white font-mono tracking-wider">
                    {code}
                  </code>
                  <Copy
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-200/40 group-hover:text-blue-200 transition-colors"
                  />
                </button>
              ))}
            </div>
          )}

          <p className="text-xs text-blue-200/60 mt-3">
            Save these codes in a secure location. Each code can only be used
            once if you lose access to your device.
          </p>
        </div>
      )}
    </div>
  );
}
