# Glossary

Domain terms used across the codebase, docs, and issue tracker. If a term is
ambiguous or missing, add it here rather than letting a new definition grow
in someone's head.

## Booking

A tenant's request to rent a property for a given period, created via the
`bookings` module (`backend/src/modules/bookings`). Distinct from an
**agreement**: a booking is the request/reservation; once accepted, it leads
to a formal rental agreement.

## Agreement

The on-chain and off-chain record of a finalized rental arrangement between a
tenant and a property owner, covering rent amount, duration, and terms.
Backed by the `agreements` module and the `chioma` core Soroban contract.

## Escrow

A smart-contract-held security deposit, released only with a **2-of-3
multi-sig** mechanism (see the Soroban `escrow` contract,
`contract/contracts/escrow`). No single party, tenant, owner, or platform,
can unilaterally release or withhold the deposit.

## Dispute

A formal disagreement raised against an agreement or booking (e.g. over a
security deposit, property condition, or payment), handled by the
`disputes` module and the `dispute_resolution` Soroban contract. Disputes
have their own resolution workflow, separate from ordinary support/feedback.

## Rate limiting

Per-endpoint request throttling enforced by `@nestjs/throttler`
(`backend/src/app.module.ts`), configured with three named tiers:

- `default`: general API traffic.
- `auth`: login/auth endpoints (tighter limits to slow credential stuffing).
- `strict`: sensitive or expensive endpoints.

Each tier has its own `TTL`/`MAX` environment variables (e.g.
`RATE_LIMIT_AUTH_TTL`, `RATE_LIMIT_AUTH_MAX`). Not to be confused with
**API scopes** (below), which control *what* an API key can do, not how
often.

## API scope

A named permission (e.g. `properties:read`, `bookings:write`) that an API
key can be granted at creation. Enforced by `ApiKeyGuard` and
`@RequireApiScopes()`. See
[`backend/src/modules/developer/constants/api-scopes.ts`](../backend/src/modules/developer/constants/api-scopes.ts)
for the canonical list, and
[`docs/api-authentication-guide.md`](api-authentication-guide.md) for how
API keys relate to Bearer/JWT auth.

## Rental mode

How a property is offered: `LONG_TERM`, `SHORT_TERM`, `HYBRID`, or
`FLEXIBLE` (`PropertyRentalMode` enum,
`backend/src/modules/properties/entities/property.entity.ts`). Distinct from
**listing status** (below), which tracks the listing's lifecycle, not its
rental terms.

## Listing status

The lifecycle state of a property listing: `DRAFT`, `PUBLISHED`, `RENTED`,
or `ARCHIVED` (`ListingStatus` enum, same file as above). Public API
endpoints default to `PUBLISHED` only unless a caller explicitly requests
another status for their own properties.

## KYC

Know Your Customer: identity verification handled by the `kyc` module,
required before certain actions (e.g. becoming a property owner or agent)
to meet compliance requirements.

## Fraud screening

Automated risk scoring on bookings/agreements, handled by the `fraud`
module, distinct from **KYC** (identity verification happens once; fraud
screening runs per transaction/action).

## Subletting

A tenant re-renting all or part of their rented property to another party,
with its own approval and tracking flow (`subletting` module), separate
from the primary owner-to-tenant agreement.

## SEP-0010

The Stellar Ecosystem Proposal for wallet-based authentication: proving
control of a Stellar wallet by signing a challenge transaction, without
exposing a private key. One of the two authentication mechanisms this
platform supports (see [ADR-0004](adr/ADR-0004-dual-authentication.md) and
the dual-auth entry in the [decision log](DECISION_LOG.md)); the other is
traditional JWT/email+password.
