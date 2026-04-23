# Audit Logging

## Overview

This document defines audit logging standards for Chioma — what events to log,
the required log format, retention policies, access controls, security
requirements, and how to analyze and troubleshoot audit logs.

Audit logs are a compliance requirement under GDPR, SOC 2, and FCRA, and a
critical tool for incident investigation.

Use this document alongside:

- `backend/docs/security/SECURITY_POLICIES_AND_STANDARDS.md`
- `backend/docs/compliance/COMPLIANCE_AND_REGULATIONS.md`
- `backend/docs/LOGGING_AND_MONITORING.md`

---

## Table of Contents

- [Audit Standards](#audit-standards)
- [What to Log](#what-to-log)
- [Log Format](#log-format)
- [Retention](#retention)
- [Access Control](#access-control)
- [Security](#security)
- [Analysis](#analysis)
- [Audit Logging Checklist](#audit-logging-checklist)
- [Troubleshooting](#troubleshooting)

---

## Audit Standards

Chioma's audit logging follows these principles:

- **Completeness** — every privileged action and sensitive data access is logged
- **Integrity** — audit logs must not be modifiable by the actors they record
- **Availability** — logs must be queryable by authorized personnel without application downtime
- **Minimization** — logs capture the minimum fields needed for accountability; raw secrets and personal data payloads are never logged
- **Timeliness** — log entries are written synchronously or with guaranteed delivery; dropped entries are treated as a system fault

The `AuditLogInterceptor` and audit decorators in
`backend/src/modules/security/` are the primary enforcement points.

---

## What to Log

### Authentication Events

| Event                   | Trigger                                     |
| ----------------------- | ------------------------------------------- |
| `auth.login.success`    | Successful password or Stellar wallet login |
| `auth.login.failure`    | Failed login attempt                        |
| `auth.logout`           | Explicit logout                             |
| `auth.token.refresh`    | JWT refresh token used                      |
| `auth.mfa.enabled`      | MFA device registered                       |
| `auth.mfa.disabled`     | MFA device removed                          |
| `auth.password.changed` | Password updated by user                    |
| `auth.password.reset`   | Password reset via forgot-password flow     |
| `auth.account.locked`   | Account locked after repeated failures      |

### Authorization Events

| Event                      | Trigger                                      |
| -------------------------- | -------------------------------------------- |
| `authz.access.denied`      | Request rejected by role or permission guard |
| `authz.role.assigned`      | Role granted to a user                       |
| `authz.role.revoked`       | Role removed from a user                     |
| `authz.permission.granted` | Fine-grained permission added                |
| `authz.permission.revoked` | Fine-grained permission removed              |

### Personal Data Access

| Event                        | Trigger                                            |
| ---------------------------- | -------------------------------------------------- |
| `data.personal.read`         | Personal data record accessed (KYC, profile, etc.) |
| `data.personal.exported`     | Data export generated for a user                   |
| `data.personal.deleted`      | Personal data deleted on erasure request           |
| `data.screening.report.read` | Tenant screening report accessed                   |

### Payment and Financial Events

| Event                    | Trigger                                         |
| ------------------------ | ----------------------------------------------- |
| `payment.initiated`      | Rent payment transaction submitted              |
| `payment.completed`      | Payment confirmed on Stellar network            |
| `payment.failed`         | Payment transaction failed or rejected          |
| `deposit.locked`         | Security deposit placed in escrow               |
| `deposit.released`       | Security deposit released to tenant or landlord |
| `commission.distributed` | Agent commission payment executed               |

### Administrative Events

| Event                  | Trigger                                |
| ---------------------- | -------------------------------------- |
| `admin.user.created`   | Admin creates a user account           |
| `admin.user.suspended` | Admin suspends a user account          |
| `admin.user.deleted`   | Admin deletes a user account           |
| `admin.config.changed` | System configuration modified by admin |
| `admin.secret.rotated` | Secret rotation performed              |

### System Events

| Event                   | Trigger                               |
| ----------------------- | ------------------------------------- |
| `system.startup`        | Application process started           |
| `system.shutdown`       | Application process stopped           |
| `system.error.critical` | Unhandled exception or critical fault |

---

## Log Format

All audit log entries must be structured JSON with the following fields:

```json
{
  "timestamp": "2026-04-23T15:50:57.186Z",
  "level": "audit",
  "event": "auth.login.success",
  "actor": {
    "id": "usr_01HXYZ",
    "role": "tenant",
    "ip": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ..."
  },
  "resource": {
    "type": "user",
    "id": "usr_01HXYZ"
  },
  "outcome": "success",
  "correlationId": "req_01HABC",
  "metadata": {}
}
```

### Field Definitions

| Field             | Required | Description                                                         |
| ----------------- | -------- | ------------------------------------------------------------------- |
| `timestamp`       | Yes      | ISO 8601 UTC timestamp                                              |
| `level`           | Yes      | Always `"audit"` for audit log entries                              |
| `event`           | Yes      | Dot-namespaced event identifier from the event table above          |
| `actor.id`        | Yes      | User ID, service account ID, or `"system"` for automated actions    |
| `actor.role`      | No       | Role of the actor at the time of the action                         |
| `actor.ip`        | No       | Source IP address                                                   |
| `actor.userAgent` | No       | HTTP User-Agent header                                              |
| `resource.type`   | No       | Type of the resource being acted on                                 |
| `resource.id`     | No       | ID of the resource being acted on                                   |
| `outcome`         | Yes      | `"success"` or `"failure"`                                          |
| `correlationId`   | No       | Request correlation ID for cross-log tracing                        |
| `metadata`        | No       | Additional context; must never contain secrets or raw personal data |

### Prohibited Fields

Never include in audit log entries:

- passwords or password hashes
- JWT tokens or refresh tokens
- encryption keys or secret values
- raw KYC payloads or full document scans
- full payment card numbers

---

## Retention

| Log class                    | Minimum retention | Recommended retention          |
| ---------------------------- | ----------------- | ------------------------------ |
| Authentication events        | 12 months         | 24 months                      |
| Authorization events         | 12 months         | 24 months                      |
| Personal data access         | 24 months         | 36 months                      |
| Payment and financial events | 24 months         | 7 years (financial regulation) |
| Administrative events        | 24 months         | 36 months                      |
| System events                | 6 months          | 12 months                      |

Logs must not be deleted before the minimum retention period expires. Automated
deletion after the retention window is acceptable and recommended to limit
unnecessary data accumulation.

---

## Access Control

- audit logs are readable by security leads and compliance officers only
- application services may write to audit logs but must not read or delete them
- no developer has standing write access to modify existing audit log entries
- production audit log storage is separate from the main application database
- access to audit log storage is itself logged

---

## Security

- audit log entries are written with append-only semantics where the storage
  backend supports it
- log integrity can be verified using cryptographic checksums or a write-once
  storage policy
- audit log storage credentials are managed as critical secrets per
  `SECRETS_MANAGEMENT.md`
- audit logs are included in the backup and recovery plan
- alerts are configured to fire if the audit log pipeline stops producing entries
  (silence detection)

---

## Analysis

### Routine Review

Security and compliance leads should review audit logs:

- daily: authentication failures, access denied events, and admin actions
- weekly: personal data access patterns and payment anomalies
- monthly: full review of administrative events and role changes

### Incident Investigation

When investigating a security incident:

1. Identify the time window and affected resource or user.
2. Query audit logs by `actor.id`, `resource.id`, or `correlationId`.
3. Reconstruct the sequence of events using `timestamp` ordering.
4. Export the relevant log slice as evidence and preserve it before any retention
   cleanup runs.

### Tooling

Audit logs are shipped to Loki and queryable via Grafana. Use the `level="audit"`
filter as the starting point for all audit log queries.

Example Loki query:

```logql
{app="chioma-backend"} | json | level="audit" | event=~"auth\\.login.*"
```

---

## Audit Logging Checklist

- [ ] `AuditLogInterceptor` applied to all privileged routes
- [ ] audit decorators used on admin and sensitive service methods
- [ ] all events in the "What to Log" tables are covered
- [ ] log entries conform to the required JSON format
- [ ] prohibited fields (secrets, raw personal data) are absent from all log entries
- [ ] audit log storage is separate from the main application database
- [ ] retention periods configured and automated deletion scheduled
- [ ] access to audit log storage restricted to authorized roles
- [ ] silence detection alert configured for audit log pipeline
- [ ] audit log backup included in the recovery plan
- [ ] Grafana dashboard created for routine audit log review

---

## Troubleshooting

### Audit log entries missing for a known action

Verify the route or service method has the `AuditLogInterceptor` or audit
decorator applied. Check that the interceptor is registered in the module
providers and not excluded by a guard short-circuit.

### High volume of `authz.access.denied` events

Could indicate a misconfigured client, a scanning attempt, or a role
misconfiguration. Cross-reference `actor.ip` and `actor.id` to distinguish
between a legitimate user hitting a permission boundary and an external probe.

### Audit log pipeline silent alert firing

Check the health of the log shipper (Promtail) and the Loki ingestion endpoint.
Verify the application is still running and emitting logs. Review the
`LOGGING_AND_MONITORING.md` runbook for the monitoring stack.

### Cannot query logs older than retention window

Logs past the retention window are deleted by policy. If older logs are needed
for a legal hold or investigation, check whether a backup snapshot predating the
deletion is available.
