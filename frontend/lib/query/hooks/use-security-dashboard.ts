'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '../keys';
import type {
  IncidentMetricsRecord,
  SecurityEventRecord,
  SecurityIncidentRecord,
  ThreatEventRecord,
  ThreatStatsRecord,
} from '@/lib/security-dashboard';

const LIVE_REFRESH_MS = 15_000;

function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });

  const str = qs.toString();
  return str ? `?${str}` : '';
}

export function useSecurityEvents(
  params: { hours?: number; limit?: number } = {},
) {
  const normalized = {
    hours: params.hours ?? 72,
    limit: params.limit ?? 150,
  };

  return useQuery({
    queryKey: queryKeys.security.events(normalized),
    queryFn: async () => {
      const { data } = await apiClient.get<SecurityEventRecord[]>(
        `/security/events${buildQueryString(normalized)}`,
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useThreats(params: { limit?: number } = {}) {
  const normalized = {
    limit: params.limit ?? 60,
  };

  return useQuery({
    queryKey: queryKeys.security.threats(normalized),
    queryFn: async () => {
      const { data } = await apiClient.get<ThreatEventRecord[]>(
        `/security/threats${buildQueryString(normalized)}`,
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useThreatStats(params: { hours?: number } = {}) {
  const normalized = {
    hours: params.hours ?? 72,
  };

  return useQuery({
    queryKey: queryKeys.security.threatStats(normalized),
    queryFn: async () => {
      const { data } = await apiClient.get<ThreatStatsRecord>(
        `/security/threats/stats${buildQueryString(normalized)}`,
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useSecurityIncidents() {
  return useQuery({
    queryKey: queryKeys.security.incidents(),
    queryFn: async () => {
      const { data } = await apiClient.get<SecurityIncidentRecord[]>(
        '/security/incidents',
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useIncidentMetrics() {
  return useQuery({
    queryKey: queryKeys.security.incidentMetrics(),
    queryFn: async () => {
      const { data } = await apiClient.get<IncidentMetricsRecord>(
        '/security/incidents/metrics',
      );
      return data;
    },
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: true,
  });
}

export function useMarkThreatFalsePositive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threatId: string) => {
      await apiClient.patch<void>(
        `/security/threats/${threatId}/false-positive`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
  });
}

export function useResolveSecurityIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      resolution,
    }: {
      incidentId: string;
      resolution: string;
    }) => {
      const { data } = await apiClient.post<SecurityIncidentRecord | null>(
        `/security/incidents/${incidentId}/resolve`,
        { resolution },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.security.all });
    },
  });
}

export async function fetchSecurityIncidentReport(incidentId: string) {
  const { data } = await apiClient.get<Record<string, unknown>>(
    `/security/incidents/${incidentId}/report`,
  );
  return data;
}
