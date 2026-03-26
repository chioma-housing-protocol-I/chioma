/**
 * Enhanced offline indicator with sync status and queue information.
 */

'use client';

import { useEffect, useState } from 'react';
import { useOfflineStatus, useSync } from '@/lib/offline/hooks';
import { FiWifi, FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

export function OfflineIndicator() {
  const { isOnline, queueSize, hasConflicts } = useOfflineStatus();
  const { sync, isSyncing, lastSyncResult } = useSync();
  const [showDetails, setShowDetails] = useState(false);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueSize > 0) {
      sync();
    }
  }, [isOnline, queueSize, sync]);

  if (isOnline && queueSize === 0 && !hasConflicts) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg border bg-white shadow-lg">
        {/* Main indicator */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-3 px-4 py-3 text-sm"
        >
          {isOnline ? (
            <FiWifi className="h-5 w-5 text-green-600" />
          ) : (
            <FiWifiOff className="h-5 w-5 text-amber-600" />
          )}

          <div className="text-left">
            <div className="font-medium">
              {isOnline ? 'Online' : 'Offline Mode'}
            </div>
            {queueSize > 0 && (
              <div className="text-xs text-gray-600">
                {queueSize} pending {queueSize === 1 ? 'action' : 'actions'}
              </div>
            )}
          </div>

          {hasConflicts && <FiAlertCircle className="h-5 w-5 text-red-600" />}
        </button>

        {/* Details panel */}
        {showDetails && (
          <div className="border-t px-4 py-3">
            <div className="space-y-2 text-sm">
              {queueSize > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sync queue:</span>
                  <span className="font-medium">{queueSize}</span>
                </div>
              )}

              {hasConflicts && (
                <div className="flex items-center gap-2 text-red-600">
                  <FiAlertCircle className="h-4 w-4" />
                  <span>Conflicts detected</span>
                </div>
              )}

              {lastSyncResult && (
                <div className="text-xs text-gray-500">
                  Last sync: {lastSyncResult.processed} processed,{' '}
                  {lastSyncResult.failed} failed
                </div>
              )}

              {isOnline && queueSize > 0 && (
                <button
                  onClick={() => sync()}
                  disabled={isSyncing}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <FiRefreshCw
                    className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
