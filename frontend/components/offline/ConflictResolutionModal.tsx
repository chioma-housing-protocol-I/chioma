/**
 * Modal for resolving sync conflicts.
 */

'use client';

import { useState } from 'react';
import { useConflicts } from '@/lib/offline/hooks';
import {
  resolveConflictWithStrategy,
  type ConflictResolutionStrategy,
} from '@/lib/offline/conflict-resolver';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
}: ConflictResolutionModalProps) {
  const { conflicts, loading, refresh } = useConflicts();
  const [resolving, setResolving] = useState(false);
  const [selectedStrategy, setSelectedStrategy] =
    useState<ConflictResolutionStrategy>('server-wins');

  if (!isOpen) return null;

  const handleResolve = async (conflictId: string) => {
    setResolving(true);
    try {
      const conflict = conflicts.find((c) => c.id === conflictId);
      if (conflict) {
        await resolveConflictWithStrategy(conflict, selectedStrategy);
        await refresh();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(false);
    }
  };

  const handleResolveAll = async () => {
    setResolving(true);
    try {
      await Promise.all(
        conflicts.map((conflict) =>
          resolveConflictWithStrategy(conflict, selectedStrategy),
        ),
      );
      await refresh();
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-semibold">Resolve Conflicts</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Strategy selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">
            Resolution Strategy
          </label>
          <select
            value={selectedStrategy}
            onChange={(e) =>
              setSelectedStrategy(e.target.value as ConflictResolutionStrategy)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="server-wins">Server Wins (Recommended)</option>
            <option value="client-wins">Client Wins</option>
            <option value="last-write-wins">Last Write Wins</option>
          </select>
          <p className="mt-1 text-xs text-gray-600">
            {selectedStrategy === 'server-wins' &&
              'Always use the server version (safest option)'}
            {selectedStrategy === 'client-wins' &&
              'Always use your local version'}
            {selectedStrategy === 'last-write-wins' &&
              'Use the most recently modified version'}
          </p>
        </div>

        {/* Conflicts list */}
        <div className="mb-4 max-h-96 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-600">
              Loading conflicts...
            </div>
          ) : conflicts.length === 0 ? (
            <div className="py-8 text-center text-gray-600">
              No conflicts to resolve
            </div>
          ) : (
            conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-md border border-gray-200 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize">
                      {conflict.entity}
                    </div>
                    <div className="text-xs text-gray-600">
                      ID: {conflict.entityId}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolve(conflict.id)}
                    disabled={resolving}
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Detected: {new Date(conflict.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Cancel
          </button>
          {conflicts.length > 0 && (
            <button
              onClick={handleResolveAll}
              disabled={resolving}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {resolving ? 'Resolving...' : 'Resolve All'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
