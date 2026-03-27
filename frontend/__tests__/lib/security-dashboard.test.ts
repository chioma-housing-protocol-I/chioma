import { describe, expect, it } from 'vitest';
import {
  buildSecurityDashboardSummary,
  filterSecurityFeed,
  normalizeSecurityFeed,
  parseSecurityDetails,
  type SecurityEventRecord,
  type SecurityIncidentRecord,
  type ThreatEventRecord,
} from '@/lib/security-dashboard';

const securityEvents: SecurityEventRecord[] = [
  {
    id: 'event-1',
    userId: 'user-1',
    eventType: 'failed_login',
    severity: 'high',
    ipAddress: '192.168.1.5',
    userAgent: 'Mozilla/5.0',
    details: JSON.stringify({ reason: 'invalid password' }),
    success: false,
    errorMessage: 'Invalid credentials',
    createdAt: '2026-03-27T10:00:00.000Z',
  },
];

const threats: ThreatEventRecord[] = [
  {
    id: 'threat-1',
    userId: 'user-2',
    ipAddress: '203.0.113.8',
    userAgent: 'curl/8.0',
    requestPath: '/api/auth/login',
    requestMethod: 'POST',
    threatType: 'brute_force',
    threatLevel: 'critical',
    status: 'investigating',
    evidence: { failedAttempts: 12 },
    description: 'Brute force attempt detected',
    blocked: true,
    autoMitigated: true,
    mitigationAction: 'ip_temp_block',
    createdAt: '2026-03-27T11:00:00.000Z',
    updatedAt: '2026-03-27T11:05:00.000Z',
  },
];

const incidents: SecurityIncidentRecord[] = [
  {
    id: 'incident-1',
    severity: 'P1',
    title: 'Critical brute force from 203.0.113.8',
    description: 'Multiple credential stuffing attempts detected.',
    affectedUsers: ['user-1', 'user-2'],
    threatEvents: threats,
    timeline: [
      {
        timestamp: '2026-03-27T11:05:00.000Z',
        action: 'Threat detected',
        actor: 'system',
      },
    ],
    status: 'investigating',
    createdAt: '2026-03-27T11:05:00.000Z',
    responseActions: ['lock_account', 'alert_user'],
  },
];

describe('security dashboard helpers', () => {
  it('parses JSON detail strings safely', () => {
    expect(parseSecurityDetails('{"foo":"bar"}')).toEqual({ foo: 'bar' });
    expect(parseSecurityDetails('not-json')).toEqual({ raw: 'not-json' });
    expect(parseSecurityDetails(null)).toBeNull();
  });

  it('normalizes events, threats, and incidents into a single feed', () => {
    const feed = normalizeSecurityFeed(securityEvents, threats, incidents);

    expect(feed).toHaveLength(3);
    expect(feed[0]).toMatchObject({
      id: 'incident-1',
      kind: 'incident',
      severity: 'critical',
    });
    expect(feed[1]).toMatchObject({
      id: 'threat-1',
      kind: 'threat',
      actionable: true,
    });
    expect(feed[2]).toMatchObject({
      id: 'event-1',
      kind: 'event',
      status: 'failed',
    });
  });

  it('filters the feed by search, severity, kind, and actionable flag', () => {
    const feed = normalizeSecurityFeed(securityEvents, threats, incidents);

    expect(
      filterSecurityFeed(feed, {
        search: 'credential',
        severity: 'all',
        kind: 'all',
      }),
    ).toHaveLength(2);

    expect(
      filterSecurityFeed(feed, {
        severity: 'critical',
        kind: 'all',
      }),
    ).toHaveLength(2);

    expect(
      filterSecurityFeed(feed, {
        kind: 'event',
        onlyActionable: true,
      }),
    ).toHaveLength(1);
  });

  it('builds a summary with severity and type counts', () => {
    const feed = normalizeSecurityFeed(securityEvents, threats, incidents);
    const summary = buildSecurityDashboardSummary(
      feed,
      {
        total: 1,
        byCritical: 1,
        byHigh: 0,
        byType: { brute_force: 1 },
        blocked: 1,
        autoMitigated: 1,
      },
      {
        openIncidents: 1,
        p1Count: 1,
        p2Count: 0,
        avgResolutionMinutes: 14,
        slaCompliance: 92,
      },
    );

    expect(summary.totalSignals).toBe(3);
    expect(summary.criticalSignals).toBe(3);
    expect(summary.openIncidents).toBe(1);
    expect(summary.blockedThreats).toBe(1);
    expect(summary.typeCounts[0]).toMatchObject({
      key: 'brute_force',
      count: 1,
    });
  });
});
