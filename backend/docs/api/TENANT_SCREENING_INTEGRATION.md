# Tenant Screening Integration Guide

## Endpoints

### Create screening request

`POST /api/screenings/tenant/request`

Allowed roles:

- `landlord`
- `agent`
- `admin`

Example payload:

```json
{
  "tenantId": "tenant-user-id",
  "provider": "TRANSUNION_SMARTMOVE",
  "requestedChecks": ["CREDIT", "BACKGROUND", "RENTAL_HISTORY"],
  "consentVersion": "2026-03-screening-v1",
  "applicantData": {
    "legalName": "Jane Tenant",
    "email": "jane@example.com",
    "dateOfBirth": "1994-06-18",
    "currentAddress": "12 Example Street"
  }
}
```

### Grant consent

`POST /api/screenings/tenant/:id/consent`

Example payload:

```json
{
  "consentTextVersion": "2026-03-screening-v1"
}
```

### Get screening status

`GET /api/screenings/tenant/:id`

### Get screening report

`GET /api/screenings/tenant/:id/report`

### Provider webhook

`POST /api/screenings/tenant/webhook`

Required headers:

- `X-Webhook-Timestamp`
- `X-Webhook-Signature`

## Sandbox Behavior

When `TENANT_SCREENING_SANDBOX_MODE=true`:

- screening requests complete automatically after consent
- a deterministic sandbox report is generated
- notification and outbound webhook paths still run

This gives the workflow a safe integration path without production credentials.

## Provider Mapping

The current implementation uses a generic provider submission contract:

```json
{
  "tenantId": "tenant-user-id",
  "externalReference": "screening-request-id",
  "requestedChecks": ["CREDIT", "BACKGROUND"],
  "applicantData": {},
  "consent": {
    "version": "2026-03-screening-v1",
    "grantedAt": "2026-03-26T12:00:00.000Z"
  }
}
```

Teams integrating a live vendor should map this payload to the provider-specific schema supplied under the commercial agreement.
