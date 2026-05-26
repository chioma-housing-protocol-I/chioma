# Error Notification and Escalation

Production-ready error notification and escalation for the Chioma backend.

## Overview

The monitoring stack receives Prometheus/Alertmanager webhooks, sends immediate notifications, and escalates unresolved critical alerts through configured tiers. Automated health checks also trigger notifications when services degrade.

## Architecture

```
Prometheus alerts
      │
      ▼
Alertmanager (monitoring/alertmanager/alertmanager.yml)
      │
      ▼
POST /api/alerts/webhook  ──►  AlertService
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
         ErrorNotificationService              ErrorEscalationService
         (email + Slack)                       (tracks + cron escalation)
                    │
                    ▼
              EmailService / Slack webhook

HealthAutomationService (every 5 min)
      │
      ▼
ErrorNotificationService.notifyHealthDegradation()
```

## Configuration

Set these environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `ERROR_NOTIFICATION_ENABLED` | Enable outbound notifications | `false` |
| `ALERT_ONCALL_EMAIL` | Primary on-call recipient(s), comma-separated | — |
| `ALERT_ESCALATION_EMAIL` | Tier-2 escalation recipient(s) | falls back to on-call |
| `ALERT_MANAGEMENT_EMAIL` | Tier-3 management recipient(s) | optional |
| `SLACK_ALERT_WEBHOOK_URL` | Slack incoming webhook for alerts | optional |
| `ALERT_ESCALATION_MINUTES` | Minutes before tier-2 escalation | `15` |
| `ALERT_ESCALATION_TIER2_MINUTES` | Minutes before tier-3 escalation | `30` |
| `ALERT_WEBHOOK_SECRET` | HMAC secret for Alertmanager webhook | required in prod |

Enable in staging/production:

```bash
ERROR_NOTIFICATION_ENABLED=true
ALERT_ONCALL_EMAIL=oncall@chioma.app
ALERT_ESCALATION_EMAIL=platform-leads@chioma.app
SLACK_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_WEBHOOK_SECRET=<strong-random-secret>
```

## Escalation tiers

| Tier | When | Recipients | Channels |
|------|------|------------|----------|
| 1 — On-call | Alert fires (critical/high/warning) | `ALERT_ONCALL_EMAIL` | Email; Slack for critical/high |
| 2 — Team | Unresolved after `ALERT_ESCALATION_MINUTES` | `ALERT_ESCALATION_EMAIL` | Email + Slack |
| 3 — Management | Unresolved after `ALERT_ESCALATION_TIER2_MINUTES` | `ALERT_MANAGEMENT_EMAIL` | Email + Slack |

Resolved alerts clear tracking state and send a resolution notice to on-call recipients.

## Alertmanager integration

Alertmanager routes alerts to the backend webhook. Example config: `backend/monitoring/alertmanager/alertmanager.yml`.

Prometheus rules: `backend/monitoring/prometheus/alerts.yml`.

Test the webhook locally:

```bash
curl -X POST http://localhost:5000/api/alerts/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature>" \
  -d '{
    "alerts": [{
      "status": "firing",
      "labels": { "alertname": "HighErrorRate", "severity": "critical" },
      "annotations": { "summary": "Test alert", "description": "Manual test" },
      "startsAt": "2026-05-26T12:00:00.000Z",
      "generatorURL": "http://localhost:9090"
    }]
  }'
```

## Health check notifications

`HealthAutomationService` runs every 5 minutes. When status is `warning` or `error`, it calls `ErrorNotificationService.notifyHealthDegradation()` with service details.

## Development

Keep `ERROR_NOTIFICATION_ENABLED=false` locally to avoid sending real emails. Alerts are still logged by `AlertService`.

## Related documentation

- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Incident Response](../INCIDENT_RESPONSE.md)
- [Logging and Monitoring](../LOGGING_AND_MONITORING.md)

## Testing

```bash
cd backend
pnpm exec jest src/modules/monitoring/error-notification.service.spec.ts --forceExit
pnpm exec jest src/modules/monitoring/error-escalation.service.spec.ts --forceExit
pnpm exec jest src/modules/monitoring/alert.service.spec.ts --forceExit
```
