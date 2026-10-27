# PCI-DSS and AML/KYC Compliance

Companion to [COMPLIANCE_AND_REGULATIONS.md](COMPLIANCE_AND_REGULATIONS.md)
(GDPR, CCPA, SOC 2, data residency) and
[TENANT_SCREENING_COMPLIANCE.md](TENANT_SCREENING_COMPLIANCE.md) (tenant
background checks): this covers payment-card handling and identity/anti-
money-laundering requirements specifically.

## PCI-DSS

### Current scope: SAQ A-eligible, not full PCI-DSS

Chioma never receives, transmits, or stores raw cardholder data
(`payments/payment-gateway.service.ts`'s `tokenizePaymentMethod` only
ever handles a `gatewayReference`, a one-time reference returned by the
payment gateway's own hosted card-entry flow, and exchanges it for an
opaque token). This keeps Chioma eligible for the lightest PCI-DSS
Self-Assessment Questionnaire tier (SAQ A, "card-not-present merchants,
fully outsourced"), rather than full PCI-DSS Level 1 compliance, which
would apply if this backend ever touched a raw PAN (primary account
number), CVV, or card expiry directly.

**This is a deliberate architectural property, not an incidental one: it
must be preserved.** Any future change that has this backend accept,
log, or store a raw card number, CVV, or full magnetic-stripe/chip track
data moves Chioma out of SAQ A and into a materially heavier compliance
tier.

### Controls currently in place

- **No raw card data ever reaches this backend.** Card entry happens on
  the payment gateway's own hosted page/SDK; this backend only ever
  receives a `gatewayReference` token (see `tokenizePaymentMethod` and
  its test suite, `payment-gateway.service.spec.ts`).
- **Encryption at rest for other sensitive financial fields** via
  `EncryptionService` (used by `kyc.service.ts` for KYC payloads; the
  same service backs payment-adjacent sensitive fields).
- **Audit logging** of payment and KYC state changes via `AuditService`
  (`AuditAction`/`AuditLevel`/`AuditStatus` on every KYC submit/approve/
  reject, mirrored for payment status transitions).
- **TLS in transit** for all API traffic (see
  `AUTHENTICATION_GUIDE.md` and the deployment TLS docs under
  `backend/docs/SSL_TLS_CERTIFICATE_MANAGEMENT.md`).

### Gaps / what SAQ A still requires that isn't automated here

- **Annual SAQ A attestation** is a compliance-team process, not
  something the codebase can self-certify; this doc does not replace
  that attestation.
- **Vulnerability scanning of the systems that *do* touch card data**
  (the payment gateway's own infrastructure) is the gateway provider's
  responsibility under their own PCI-DSS Level 1 certification, not
  something to replicate here.

## AML / KYC

### What exists today

The `kyc` module (`backend/src/modules/kyc/kyc.service.ts`) implements:

- **Identity verification submission and provider webhook handling**
  (`submitKyc`, `handleWebhook`): a third-party KYC provider performs the
  actual identity check; this backend stores the result and status.
- **Encrypted storage of submitted KYC data** (`encryptSensitiveKycFields`/
  `decryptSensitiveKycFields`, `kyc-encryption.util.ts`) and a content
  hash of the submitted payload (`hashKycPayload`) for tamper detection.
- **Admin review workflow** (`approveKyc`/`rejectKyc`,
  `findPendingForAdmin`) with full audit trail.
- **Per-user KYC status gating** via `UserKycStatusService`, used
  elsewhere in the app to gate actions that require verified identity
  (e.g. becoming a property owner or agent).

### What does not exist today (a real gap, not a documentation gap)

- **No sanctions/watchlist screening** (OFAC, UN, EU consolidated lists,
  or any equivalent) was found anywhere in `kyc` or `fraud`. Verified
  identity today means "a KYC provider confirmed this person's identity
  documents," not "this person was checked against a sanctions list."
  For a platform handling cross-border rent/escrow payments, this is the
  single largest AML gap, not a documentation omission; it needs a real
  sanctions-screening integration, which is a product/engineering
  decision outside this docs issue's scope.
- **No suspicious activity reporting (SAR) workflow.** There is no
  mechanism to flag or report a transaction pattern as suspicious to a
  regulator; `fraud`'s existing risk scoring (see the fraud module) is
  about transaction-level risk, not AML-specific suspicious-activity
  detection or reporting.
- **No transaction monitoring thresholds tied to AML reporting
  requirements** (e.g. structuring detection, large cross-border
  transfer flags).

### Recommendation

Treat "sanctions screening + SAR workflow" as its own tracked
engineering issue, not something this documentation PR can close by
itself; the gap is real and should stay visible rather than be
implicitly marked "documented" by this file's existence.
