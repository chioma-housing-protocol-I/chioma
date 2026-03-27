'use client';

import { useState, useMemo } from 'react';
import { Plus, Webhook } from 'lucide-react';
import toast from 'react-hot-toast';
import { WebhookList } from './WebhookList';
import { WebhookForm } from './WebhookForm';
import { WebhookDetail } from './WebhookDetail';

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

type WebhookFormValues = {
  url: string;
  events: string[];
};

export function WebhookManagement() {
  const [showForm, setShowForm] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(
    null,
  );
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  const selectedWebhook = useMemo(
    () => webhooks.find((w) => w.id === selectedWebhookId),
    [webhooks, selectedWebhookId],
  );

  const handleCreateWebhook = async (data: WebhookFormValues) => {
    try {
      // In a real implementation, this would call an API
      const newWebhook: Webhook = {
        id: `webhook_${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        enabled: true,
        status: 'active',
        successRate: 0,
        failureCount: 0,
      };
      setWebhooks([...webhooks, newWebhook]);
      toast.success('Webhook created successfully');
      setShowForm(false);
    } catch {
      toast.error('Failed to create webhook');
    }
  };

  const handleUpdateWebhook = async (
    id: string,
    data: Partial<WebhookFormValues>,
  ) => {
    try {
      setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, ...data } : w)));
      toast.success('Webhook updated successfully');
      setEditingWebhook(null);
    } catch {
      toast.error('Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      setWebhooks(webhooks.filter((w) => w.id !== id));
      if (selectedWebhookId === id) setSelectedWebhookId(null);
      toast.success('Webhook deleted successfully');
    } catch {
      toast.error('Failed to delete webhook');
    }
  };

  const handleToggleWebhook = async (id: string) => {
    try {
      setWebhooks(
        webhooks.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
      );
      toast.success('Webhook updated successfully');
    } catch {
      toast.error('Failed to toggle webhook');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-cyan-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <Webhook size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Webhook Management
            </h1>
            <p className="text-blue-200/60 mt-1">
              Create and manage webhooks for your application.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setEditingWebhook(null);
              setShowForm(!showForm);
            }}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            New Webhook
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <WebhookForm
            webhook={
              editingWebhook
                ? webhooks.find((w) => w.id === editingWebhook)
                : undefined
            }
            onSubmit={(data) => {
              if (editingWebhook) {
                handleUpdateWebhook(editingWebhook, data);
              } else {
                handleCreateWebhook(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingWebhook(null);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WebhookList
            webhooks={webhooks}
            selectedId={selectedWebhookId}
            onSelect={setSelectedWebhookId}
            onToggle={handleToggleWebhook}
            onEdit={(id) => {
              setEditingWebhook(id);
              setShowForm(true);
            }}
            onDelete={handleDeleteWebhook}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedWebhook ? (
            <WebhookDetail webhook={selectedWebhook} />
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">
                Select a webhook to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
