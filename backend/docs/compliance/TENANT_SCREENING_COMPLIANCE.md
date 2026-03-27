# Tenant Screening Compliance

## Scope

This module is designed around the compliance-sensitive parts of tenant screening:

- consent capture before submission
- limited report access
- encrypted report storage
- audit logging for consent, access, and workflow changes
- webhook authentication for provider callbacks

## Current Controls

### Consent Management

- Screening requests begin in `PENDING_CONSENT`.
- A tenant or admin must explicitly grant consent before provider submission.
- Consent records store:
  - consent text version
  - timestamp
  - IP address
  - user agent
  - expiry window

### Data Minimization

- Applicant submission payloads are encrypted before persistence.
- Full provider reports are encrypted at rest.
- Only summary fields needed for workflow decisions are stored in plaintext summary form.

### Access Control

Screening reports can only be accessed by:

- the tenant
- the requesting landlord/agent
- an admin

All report reads are audit logged.

### Transmission Integrity

- Provider webhooks require HMAC-SHA256 signatures.
- Requests older than 5 minutes are rejected.
- Unsigned and invalid webhook requests are rejected and logged.

## Operational Checklist

- complete legal review of consent wording before production launch
- verify provider contract terms for permissible purpose and retention
- rotate webhook and provider API secrets using environment management
- keep sandbox mode enabled outside production
- confirm data retention policy for encrypted reports

## Environment Variables

- `TENANT_SCREENING_DEFAULT_PROVIDER`
- `TENANT_SCREENING_SANDBOX_MODE`
- `TENANT_SCREENING_CONSENT_TTL_DAYS`
- `TENANT_SCREENING_REPORT_TTL_DAYS`
- `TENANT_SCREENING_WEBHOOK_SECRET`
- `TRANSUNION_SMARTMOVE_API_URL`
- `TRANSUNION_SMARTMOVE_API_KEY`
- `EXPERIAN_CONNECT_API_URL`
- `EXPERIAN_CONNECT_API_KEY`
