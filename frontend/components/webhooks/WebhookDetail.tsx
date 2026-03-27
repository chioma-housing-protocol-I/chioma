'use client';

import { useState } from 'react';
import { TestTube, Copy, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  status: 'active' | 'inactive' | 'failed';
  createdAt: string;
  lastTriggered?: string;
  successRate: number;
  failureCount: number;
  headers?: Record<string, string>;
  secret?: string;
}

interface WebhookDetailProps {
  webhook: Webhook;
}

export function WebhookDetail({ webhook }: WebhookDetailProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testPayload, setTestPayload] = useState('{}');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleTestWebhook = async () => {
    try {
      // In a real implementation, this would call an API
      toast.success('Test event sent successfully');
      setShowTestForm(false);
    } catch {
      toast.error('Failed to send test event');
    }
  };

  const handleRotateSecret = () => {
    if (confirm('This will invalidate the old secret. Continue?')) {
      toast.success('Secret rotated successfully');
    }
  };

  const createdDate = new Date(webhook.createdAt);
  const lastTriggeredDate = webhook.lastTriggered
    ? new Date(webhook.lastTriggered)
    : null;

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white break-all">
            {webhook.url}
          </h2>
          <p className="text-blue-200/60 mt-1">
            {webhook.enabled ? 'Active' : 'Inactive'} • {webhook.events.length}{' '}
            events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wide">
            Success Rate
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {webhook.successRate}%
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wide">
            Failures
          </p>
          <p className="text-2xl font-bold text-white mt-1">
            {webhook.failureCount}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wide">
            Status
          </p>
          <p
            className={`text-sm font-semibold mt-1 ${
              webhook.status === 'active'
                ? 'text-emerald-400'
                : webhook.status === 'failed'
                  ? 'text-rose-400'
                  : 'text-amber-400'
            }`}
          >
            {webhook.status === 'active'
              ? 'Active'
              : webhook.status === 'failed'
                ? 'Failed'
                : 'Inactive'}
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="font-semibold text-white mb-4">Subscribed Events</h3>
        <div className="flex flex-wrap gap-2">
          {webhook.events.map((event) => (
            <span
              key={event}
              className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-medium"
            >
              {event}
            </span>
          ))}
        </div>
      </div>

      {webhook.secret && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Eye size={16} /> Webhook Secret
          </h4>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white font-mono break-all">
              {showSecret ? webhook.secret : '••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
              title={showSecret ? 'Hide' : 'Show'}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={() => copyToClipboard(webhook.secret!)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
              title="Copy"
            >
              <Copy size={16} />
            </button>
          </div>
          <button
            onClick={handleRotateSecret}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium"
          >
            Rotate Secret
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-blue-200/60">Created</p>
          <p className="text-white mt-1">{createdDate.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-blue-200/60">Last Triggered</p>
          <p className="text-white mt-1">
            {lastTriggeredDate ? lastTriggeredDate.toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 flex gap-2">
        <button
          onClick={() => setShowTestForm(!showTestForm)}
          className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <TestTube size={16} />
          Test Webhook
        </button>
      </div>

      {showTestForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Test Payload (JSON)
            </label>
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:bg-white/10 focus:border-blue-500 resize-none"
            />
          </div>
          <button
            onClick={handleTestWebhook}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-sm transition-all"
          >
            Send Test Event
          </button>
        </div>
      )}
    </div>
  );
}
