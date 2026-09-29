'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { ApiKeysList } from './ApiKeysList';
import { ApiKeyForm } from './ApiKeyForm';
import { ApiKeyGenerate } from './ApiKeyGenerate';
import { ApiKeyDetails } from './ApiKeyDetails';
import type { ApiKey } from './ApiKeysList';
import type { ApiKeyFormValues } from './ApiKeyForm';

export function ApiKeysManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load API keys on component mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        setIsInitializing(true);
        const { data } = await apiClient.get<ApiKey[]>('/developer/api-keys', {
          retries: 1,
          timeoutMs: 5000,
        });
        setApiKeys(data || []);
      } catch (error) {
        toast.error('Failed to load API keys');
        console.error('Error loading API keys:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadKeys();
  }, []);

  const selectedKey = useMemo(
    () => apiKeys.find((k) => k.id === selectedId),
    [apiKeys, selectedId],
  );

  const handleCreate = async (data: ApiKeyFormValues) => {
    try {
      setIsLoading(true);
      const payload = {
        name: data.name,
        description: data.description || undefined,
        permissions: data.permissions,
      };
      const { data: response } = await apiClient.post<{
        id: string;
        key: string;
        name: string;
        expiresAt: string;
      }>('/developer/api-keys', payload, { retries: 1 });

      // Refresh the keys list
      const { data: updatedKeys } = await apiClient.get<ApiKey[]>(
        '/developer/api-keys',
        { retries: 1 },
      );
      setApiKeys(updatedKeys || []);

      setGeneratedKey({ key: response.key, name: response.name });
      setShowForm(false);
      toast.success('API key generated');
    } catch (error) {
      toast.error('Failed to create API key');
      console.error('Error creating API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string, data: ApiKeyFormValues) => {
    try {
      setIsLoading(true);
      const payload: {
        name: string;
        description?: string;
        expiresAt?: string;
        permissions?: string[];
      } = {
        name: data.name,
      };

      if (data.description) {
        payload.description = data.description;
      }

      if (data.expiresAt) {
        payload.expiresAt = new Date(data.expiresAt).toISOString();
      }

      if (data.permissions) {
        payload.permissions = data.permissions;
      }

      await apiClient.patch(`/developer/api-keys/${id}`, payload, {
        retries: 1,
      });

      // Refresh the keys list
      const { data: updatedKeys } = await apiClient.get<ApiKey[]>(
        '/developer/api-keys',
        { retries: 1 },
      );
      setApiKeys(updatedKeys || []);

      toast.success('API key updated');
      setEditingId(null);
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to update API key');
      console.error('Error updating API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (
      !confirm(
        'Revoke this API key? All requests using it will immediately fail.',
      )
    )
      return;

    try {
      setIsLoading(true);
      await apiClient.delete(`/developer/api-keys/${id}`, { retries: 1 });

      // Refresh the keys list
      const { data: updatedKeys } = await apiClient.get<ApiKey[]>(
        '/developer/api-keys',
        { retries: 1 },
      );
      setApiKeys(updatedKeys || []);

      if (selectedId === id) setSelectedId(null);
      toast.success('API key revoked');
    } catch (error) {
      toast.error('Failed to revoke API key');
      console.error('Error revoking API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotate = async (id: string) => {
    if (
      !confirm(
        'Rotate this key? The current key will be revoked and a new one generated.',
      )
    )
      return;

    try {
      setIsLoading(true);
      const { data: response } = await apiClient.post<{
        id: string;
        key: string;
        name: string;
        expiresAt: string;
      }>(`/developer/api-keys/${id}/rotate`, {}, { retries: 1 });

      // Refresh the keys list
      const { data: updatedKeys } = await apiClient.get<ApiKey[]>(
        '/developer/api-keys',
        { retries: 1 },
      );
      setApiKeys(updatedKeys || []);

      setGeneratedKey({ key: response.key, name: response.name });
      toast.success('Key rotated — save your new key');
    } catch (error) {
      toast.error('Failed to rotate API key');
      console.error('Error rotating API key:', error);
    } finally {
      setIsLoading(false);
    }
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
            <h1 className="text-3xl font-bold tracking-tight text-white">
              API Keys
            </h1>
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
          disabled={isLoading || isInitializing}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all self-start sm:self-auto"
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
            apiKey={
              editingId ? apiKeys.find((k) => k.id === editingId) : undefined
            }
            isLoading={isLoading}
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
          {isInitializing ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[300px]">
              <p className="text-blue-200/60">Loading API keys...</p>
            </div>
          ) : (
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
              isLoading={isLoading}
            />
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedKey ? (
            <ApiKeyDetails
              apiKey={selectedKey}
              onRevoke={handleRevoke}
              onRotate={handleRotate}
              isLoading={isLoading}
            />
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">
                {isInitializing
                  ? 'Loading API keys...'
                  : 'Select an API key to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
