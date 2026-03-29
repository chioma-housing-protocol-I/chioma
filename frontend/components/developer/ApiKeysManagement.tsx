'use client';

import { useState, useMemo } from 'react';
import { Plus, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiKeysList } from './ApiKeysList';
import { ApiKeyForm } from './ApiKeyForm';
import { ApiKeyGenerate } from './ApiKeyGenerate';
import { ApiKeyDetails } from './ApiKeyDetails';
import type { ApiKey } from './ApiKeysList';
import type { ApiKeyFormValues } from './ApiKeyForm';

function generateKey(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(40);
  crypto.getRandomValues(array);
  array.forEach((n) => (result += chars[n % chars.length]));
  return `${prefix}_${result}`;
}

export function ApiKeysManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; name: string } | null>(null);

  const selectedKey = useMemo(
    () => apiKeys.find((k) => k.id === selectedId),
    [apiKeys, selectedId],
  );

  const handleCreate = async (data: ApiKeyFormValues) => {
    const fullKey = generateKey('chk');
    const prefix = fullKey.slice(0, 8);
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: data.name,
      description: data.description || undefined,
      keyPrefix: prefix,
      permissions: data.permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
    };
    setApiKeys((prev) => [newKey, ...prev]);
    setGeneratedKey({ key: fullKey, name: data.name });
    setShowForm(false);
    toast.success('API key generated');
  };

  const handleUpdate = async (id: string, data: ApiKeyFormValues) => {
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              name: data.name,
              description: data.description || undefined,
              permissions: data.permissions,
              expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
            }
          : k,
      ),
    );
    toast.success('API key updated');
    setEditingId(null);
    setShowForm(false);
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Revoke this API key? All requests using it will immediately fail.')) return;
    setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
    if (selectedId === id) setSelectedId(null);
    toast.success('API key revoked');
  };

  const handleRotate = (id: string) => {
    if (!confirm('Rotate this key? The current key will be revoked and a new one generated.')) return;
    const key = apiKeys.find((k) => k.id === id);
    if (!key) return;

    const fullKey = generateKey('chk');
    const prefix = fullKey.slice(0, 8);
    setApiKeys((prev) =>
      prev.map((k) =>
        k.id === id ? { ...k, keyPrefix: prefix, createdAt: new Date().toISOString() } : k,
      ),
    );
    setGeneratedKey({ key: fullKey, name: key.name });
    toast.success('Key rotated — save your new key');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-cyan-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <KeyRound size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">API Keys</h1>
            <p className="text-blue-200/60 mt-1">
              Manage your API keys for platform integration.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          New API Key
        </button>
      </div>

      {/* Generated key display (shown once) */}
      {generatedKey && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-amber-500/30">
          <ApiKeyGenerate
            keyName={generatedKey.name}
            generatedKey={generatedKey.key}
            onDone={() => setGeneratedKey(null)}
          />
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <ApiKeyForm
            apiKey={editingId ? apiKeys.find((k) => k.id === editingId) : undefined}
            onSubmit={(data) =>
              editingId ? handleUpdate(editingId, data) : handleCreate(data)
            }
            onCancel={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        </div>
      )}

      {/* List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ApiKeysList
            apiKeys={apiKeys}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(id) => {
              setEditingId(id);
              setShowForm(true);
            }}
            onRevoke={handleRevoke}
            onRotate={handleRotate}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedKey ? (
            <ApiKeyDetails
              apiKey={selectedKey}
              onRevoke={handleRevoke}
              onRotate={handleRotate}
            />
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">Select an API key to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
