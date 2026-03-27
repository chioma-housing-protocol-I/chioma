# Tenant Screening Provider Research

## Decision

Default provider selection: `TRANSUNION_SMARTMOVE`

Secondary supported provider: `EXPERIAN_CONNECT`

## Why SmartMove Is The Default

This implementation defaults to TransUnion SmartMove because its documented renter workflow is consent-driven and keeps sensitive renter identity data inside the provider flow instead of passing SSNs directly through the landlord application. That aligns well with the issue requirements for:

- explicit consent management
- secure handling of sensitive screening data
- landlord-facing credit, background, and rental-history style workflows

This is an engineering inference based on the documented tenant flow and permission model on the official SmartMove tenant FAQ.

Official references:

- https://www.mysmartmove.com/transunion-smartmove-frequently-asked-questions/tenant-frequently-asked-questions
- https://www.mysmartmove.com/

## Why Experian Remains Supported

Experian remains a supported provider option because it is a major credit bureau with screening and property-data products that can fit more enterprise-oriented integrations. It is included as a configurable provider for teams that already have Experian commercial agreements or need to standardize vendor relationships across credit products.

Official references:

- https://www.experian.com/
- https://www.experian.com/business/

## Integration Notes

- Provider selection is controlled by `TENANT_SCREENING_DEFAULT_PROVIDER`.
- Sandbox mode is controlled by `TENANT_SCREENING_SANDBOX_MODE`.
- Real provider credentials are configured per provider:
  - `TRANSUNION_SMARTMOVE_API_URL`
  - `TRANSUNION_SMARTMOVE_API_KEY`
  - `EXPERIAN_CONNECT_API_URL`
  - `EXPERIAN_CONNECT_API_KEY`

## Current Recommendation

- Use SmartMove when renter-consent-first flow is the priority.
- Use Experian when an enterprise team already has Experian data contracts.
- Keep sandbox mode enabled in non-production until provider-specific field mapping and legal review are complete.
