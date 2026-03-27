'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

type WebhookFormValues = {
  url: string;
  events: string[];
};

interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  headers?: Record<string, string>;
}

interface WebhookFormProps {
  webhook?: Webhook;
  onSubmit: (data: WebhookFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_EVENTS = [
  'lease.created',
  'lease.updated',
  'lease.deleted',
  'lease.signed',
  'payment.received',
  'payment.failed',
  'user.created',
  'user.updated',
  'user.role_changed',
  'property.listed',
  'property.updated',
  'property.delisted',
  'dispute.created',
  'dispute.resolved',
];

export function WebhookForm({
  webhook,
  onSubmit,
  onCancel,
  isLoading = false,
}: WebhookFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WebhookFormValues>({
    defaultValues: webhook
      ? {
          url: webhook.url,
          events: webhook.events,
        }
      : {
          url: '',
          events: [],
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-white">
          {webhook ? 'Edit Webhook' : 'Create New Webhook'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-blue-200/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Webhook URL
          </label>
          <input
            {...register('url', {
              required: 'Webhook URL is required',
              pattern: {
                value: /^https?:\/\/.+/,
                message: 'Must be a valid URL (http/https)',
              },
            })}
            type="url"
            placeholder="https://example.com/webhook"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
            disabled={isLoading}
          />
          {errors.url && (
            <p className="text-sm text-rose-400 mt-1">{errors.url.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Subscribe to Events
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_EVENTS.map((event) => (
              <label
                key={event}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-all"
              >
                <input
                  type="checkbox"
                  value={event}
                  {...register('events')}
                  className="accent-cyan-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-white">{event}</span>
              </label>
            ))}
          </div>
          {errors.events && (
            <p className="text-sm text-rose-400 mt-1">
              {errors.events.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Custom Headers (JSON)
          </label>
          <textarea
            placeholder='{"X-API-Key": "your-key"}'
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all resize-none font-mono text-xs"
            disabled={isLoading}
          />
          <p className="text-xs text-blue-200/60 mt-2">
            Optional: Add custom headers as JSON
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Webhook'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
