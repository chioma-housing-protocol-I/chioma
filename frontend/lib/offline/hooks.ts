/**
 * React hooks for offline functionality.
 * Provides offline-aware data fetching and mutation hooks.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store/ui-store';
import {
  syncOfflineData,
  getSyncQueueSize,
  onSyncComplete,
  type SyncResult,
} from './sync-manager';
import {
  hasUnresolvedConflicts,
  getConflictsForReview,
} from './conflict-resolver';
import { addToSyncQueue } from './db';
import {
  getCachedProperty,
  getAllCachedProperties,
  cacheProperty,
  getCachedAgreement,
  getAllCachedAgreements,
  cacheAgreement,
  getCachedPayment,
  getAllCachedPayments,
  cachePayment,
} from './cache-manager';
import type { Property, RentalAgreement, Payment } from '@/types';

// ─── Offline Status Hook ─────────────────────────────────────────────────────

export function useOfflineStatus() {
  const isOnline = useUIStore((s) => s.isOnline);
  const [queueSize, setQueueSize] = useState(0);
  const [hasConflicts, setHasConflicts] = useState(false);

  useEffect(() => {
    const updateQueueSize = async () => {
      const size = await getSyncQueueSize();
      setQueueSize(size);
    };

    const checkConflicts = async () => {
      const conflicts = await hasUnresolvedConflicts();
      setHasConflicts(conflicts);
    };

    updateQueueSize();
    checkConflicts();

    const interval = setInterval(() => {
      updateQueueSize();
      checkConflicts();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    queueSize,
    hasConflicts,
    isOfflineMode: !isOnline || queueSize > 0,
  };
}

// ─── Sync Hook ───────────────────────────────────────────────────────────────

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncOfflineData({
        onProgress: (current, total) => {
          console.log(`Syncing: ${current}/${total}`);
        },
      });
      setLastSyncResult(result);

      // Invalidate all queries after successful sync
      if (result.success) {
        await queryClient.invalidateQueries();
      }

      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = onSyncComplete((result) => {
      setLastSyncResult(result);
    });
    return unsubscribe;
  }, []);

  return {
    sync,
    isSyncing,
    lastSyncResult,
  };
}

// ─── Offline-Aware Property Hooks ────────────────────────────────────────────

export function useOfflineProperty(id: string | null) {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-property', id],
    queryFn: async () => {
      if (!id) return null;
      return getCachedProperty(id);
    },
    enabled: !isOnline && Boolean(id),
    staleTime: Infinity,
  });
}

export function useOfflineProperties() {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-properties'],
    queryFn: getAllCachedProperties,
    enabled: !isOnline,
    staleTime: Infinity,
  });
}

export function useCacheProperty() {
  return useMutation({
    mutationFn: async (property: Property) => {
      await cacheProperty(property);
    },
  });
}

// ─── Offline-Aware Agreement Hooks ───────────────────────────────────────────

export function useOfflineAgreement(id: string | null) {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-agreement', id],
    queryFn: async () => {
      if (!id) return null;
      return getCachedAgreement(id);
    },
    enabled: !isOnline && Boolean(id),
    staleTime: Infinity,
  });
}

export function useOfflineAgreements() {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-agreements'],
    queryFn: getAllCachedAgreements,
    enabled: !isOnline,
    staleTime: Infinity,
  });
}

export function useCacheAgreement() {
  return useMutation({
    mutationFn: async (agreement: RentalAgreement) => {
      await cacheAgreement(agreement);
    },
  });
}

// ─── Offline-Aware Payment Hooks ─────────────────────────────────────────────

export function useOfflinePayment(id: string | null) {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-payment', id],
    queryFn: async () => {
      if (!id) return null;
      return getCachedPayment(id);
    },
    enabled: !isOnline && Boolean(id),
    staleTime: Infinity,
  });
}

export function useOfflinePayments() {
  const { isOnline } = useOfflineStatus();

  return useQuery({
    queryKey: ['offline-payments'],
    queryFn: getAllCachedPayments,
    enabled: !isOnline,
    staleTime: Infinity,
  });
}

export function useCachePayment() {
  return useMutation({
    mutationFn: async (payment: Payment) => {
      await cachePayment(payment);
    },
  });
}

// ─── Offline Mutation Hook ───────────────────────────────────────────────────

export function useOfflineMutation<TData, TVariables>(
  entity: string,
  action: 'create' | 'update' | 'delete',
) {
  const { isOnline } = useOfflineStatus();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!isOnline) {
        // Queue for later sync
        const entityId =
          typeof variables === 'object' &&
          variables !== null &&
          'id' in variables
            ? String((variables as { id: unknown }).id)
            : '';

        await addToSyncQueue({
          action,
          entity,
          entityId,
          payload: variables,
        });

        return null;
      }

      // Online - execute immediately
      // This would be replaced with actual API call
      return variables as unknown as TData;
    },
  });
}

// ─── Conflict Resolution Hook ────────────────────────────────────────────────

export function useConflicts() {
  const [conflicts, setConflicts] = useState<
    Awaited<ReturnType<typeof getConflictsForReview>>
  >([]);
  const [loading, setLoading] = useState(true);

  const loadConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConflictsForReview();
      setConflicts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  return {
    conflicts,
    loading,
    refresh: loadConflicts,
  };
}
