'use client';

export type DashboardSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DashboardItemKind = 'event' | 'threat' | 'incident';

export interface SecurityEventRecord {
  id: string;
  userId: string | null;
  eventType: string;
  severity: DashboardSeverity;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface ThreatEventRecord {
  id: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestPath: string | null;
  requestMethod: string | null;
  threatType: string;
  threatLevel: DashboardSeverity;
  status: string;
  evidence: Record<string, unknown> | null;
  description: string | null;
  blocked: boolean;
  autoMitigated: boolean;
  mitigationAction: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineEntry {
  timestamp: string;
  action: string;
  actor: 'system' | 'analyst';
  details?: string;
}

export interface SecurityIncidentRecord {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  description: string;
  affectedUsers: string[];
  threatEvents: ThreatEventRecord[];
  timeline: IncidentTimelineEntry[];
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  responseActions: string[];
}

export interface ThreatStatsRecord {
  total: number;
  byCritical: number;
  byHigh: number;
  byType: Record<string, number>;
  blocked: number;
  autoMitigated: number;
}

export interface IncidentMetricsRecord {
  openIncidents: number;
  p1Count: number;
  p2Count: number;
  avgResolutionMinutes: number;
  slaCompliance: number;
}

export interface SecurityFeedItem {
  id: string;
  kind: DashboardItemKind;
  severity: DashboardSeverity;
  timestamp: string;
  title: string;
  description: string;
  status: string;
  sourceType: string;
  category: string;
  userId: string | null;
  ipAddress: string | null;
  searchableText: string;
  actionable: boolean;
  details: Record<string, unknown> | null;
  raw: SecurityEventRecord | ThreatEventRecord | SecurityIncidentRecord;
}

export interface SecurityFeedFilters {
  search?: string;
  severity?: DashboardSeverity | 'all';
  kind?: DashboardItemKind | 'all';
  onlyActionable?: boolean;
}

export interface SecurityDashboardSummary {
  totalSignals: number;
  criticalSignals: number;
  openIncidents: number;
  blockedThreats: number;
  autoMitigatedThreats: number;
  responseSla: number;
  severityCounts: Record<DashboardSeverity, number>;
  typeCounts: Array<{ key: string; label: string; count: number }>;
}

const EVENT_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/login|password|mfa/i, 'authentication'],
  [/api_key/i, 'api'],
  [/permission|role/i, 'authorization'],
  [/data_exported|account_deleted/i, 'data'],
  [/suspicious/i, 'threat'],
];

const THREAT_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/sql|xss|path/i, 'application'],
  [/brute_force|credential/i, 'authentication'],
  [/data_exfiltration/i, 'data'],
  [/bot|rate_limit/i, 'traffic'],
  [/privilege/i, 'authorization'],
];

function humanizeEnum(value: string): string {
  return value
    .split('_')
    .map((segment) =>
      segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment,
    )
    .join(' ');
}

function mapIncidentSeverity(
  value: SecurityIncidentRecord['severity'],
): DashboardSeverity {
  switch (value) {
    case 'P1':
      return 'critical';
    case 'P2':
      return 'high';
    case 'P3':
      return 'medium';
    default:
      return 'low';
  }
}

function categorizeValue(value: string, map: Array<[RegExp, string]>): string {
  for (const [pattern, category] of map) {
    if (pattern.test(value)) {
      return category;
    }
  }

  return 'general';
}

export function parseSecurityDetails(
  value: string | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { raw: value };
  }
}

export function normalizeSecurityFeed(
  events: SecurityEventRecord[],
  threats: ThreatEventRecord[],
  incidents: SecurityIncidentRecord[],
): SecurityFeedItem[] {
  const eventItems = events.map<SecurityFeedItem>((event) => {
    const details = parseSecurityDetails(event.details);
    const description =
      event.errorMessage ||
      (typeof details?.reason === 'string' ? details.reason : null) ||
      (event.success
        ? 'Security event recorded successfully.'
        : 'Security event failed.');

    return {
      id: event.id,
      kind: 'event',
      severity: event.severity,
      timestamp: event.createdAt,
      title: humanizeEnum(event.eventType),
      description,
      status: event.success ? 'logged' : 'failed',
      sourceType: event.eventType,
      category: categorizeValue(event.eventType, EVENT_CATEGORY_MAP),
      userId: event.userId,
      ipAddress: event.ipAddress,
      actionable:
        !event.success ||
        event.severity === 'high' ||
        event.severity === 'critical' ||
        event.eventType === 'suspicious_activity',
      details,
      searchableText: [
        event.eventType,
        description,
        event.userId,
        event.ipAddress,
        event.userAgent,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      raw: event,
    };
  });

  const threatItems = threats.map<SecurityFeedItem>((threat) => ({
    id: threat.id,
    kind: 'threat',
    severity: threat.threatLevel,
    timestamp: threat.createdAt,
    title: humanizeEnum(threat.threatType),
    description:
      threat.description ||
      `${humanizeEnum(threat.threatType)} detected on ${threat.requestPath || 'an unknown path'}.`,
    status: threat.status,
    sourceType: threat.threatType,
    category: categorizeValue(threat.threatType, THREAT_CATEGORY_MAP),
    userId: threat.userId,
    ipAddress: threat.ipAddress,
    actionable:
      threat.status !== 'false_positive' && threat.status !== 'mitigated',
    details: parseSecurityDetails(threat.evidence),
    searchableText: [
      threat.threatType,
      threat.description,
      threat.userId,
      threat.ipAddress,
      threat.requestPath,
      threat.requestMethod,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    raw: threat,
  }));

  const incidentItems = incidents.map<SecurityFeedItem>((incident) => ({
    id: incident.id,
    kind: 'incident',
    severity: mapIncidentSeverity(incident.severity),
    timestamp: incident.createdAt,
    title: incident.title,
    description:
      incident.description || 'Security incident under investigation.',
    status: incident.status,
    sourceType: incident.severity,
    category: 'incident',
    userId: incident.affectedUsers[0] ?? null,
    ipAddress: incident.threatEvents[0]?.ipAddress ?? null,
    actionable: incident.status !== 'resolved',
    details: {
      affectedUsers: incident.affectedUsers,
      responseActions: incident.responseActions,
      timelineCount: incident.timeline.length,
      threatTypes: incident.threatEvents.map((threat) => threat.threatType),
    },
    searchableText: [
      incident.title,
      incident.description,
      incident.severity,
      incident.status,
      incident.affectedUsers.join(' '),
      incident.responseActions.join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    raw: incident,
  }));

  return [...incidentItems, ...threatItems, ...eventItems].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export function filterSecurityFeed(
  items: SecurityFeedItem[],
  filters: SecurityFeedFilters,
): SecurityFeedItem[] {
  const search = filters.search?.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.kind && filters.kind !== 'all' && item.kind !== filters.kind) {
      return false;
    }

    if (
      filters.severity &&
      filters.severity !== 'all' &&
      item.severity !== filters.severity
    ) {
      return false;
    }

    if (filters.onlyActionable && !item.actionable) {
      return false;
    }

    if (search && !item.searchableText.includes(search)) {
      return false;
    }

    return true;
  });
}

export function buildSecurityDashboardSummary(
  items: SecurityFeedItem[],
  threatStats: ThreatStatsRecord | null,
  incidentMetrics: IncidentMetricsRecord | null,
): SecurityDashboardSummary {
  const severityCounts: Record<DashboardSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const typeCounter = new Map<string, number>();

  for (const item of items) {
    severityCounts[item.severity] += 1;
    typeCounter.set(
      item.sourceType,
      (typeCounter.get(item.sourceType) ?? 0) + 1,
    );
  }

  const typeCounts = Array.from(typeCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => ({
      key,
      label: humanizeEnum(key),
      count,
    }));

  return {
    totalSignals: items.length,
    criticalSignals: severityCounts.critical + severityCounts.high,
    openIncidents: incidentMetrics?.openIncidents ?? 0,
    blockedThreats: threatStats?.blocked ?? 0,
    autoMitigatedThreats: threatStats?.autoMitigated ?? 0,
    responseSla: incidentMetrics?.slaCompliance ?? 100,
    severityCounts,
    typeCounts,
  };
}

export function formatSecurityTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function buildSecurityEventLabel(value: string): string {
  return humanizeEnum(value);
}
