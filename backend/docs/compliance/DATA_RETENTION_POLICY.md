# Data Retention Policy

How long this platform keeps different categories of data, and what
actually happens, in code, when that data is deleted. Written against
the real implementations, not aspirationally; every mechanism described
here links to the file that implements it.

## User-initiated deletion (GDPR / CCPA "right to erasure")

A user can request erasure of their own account via
`POST /api/v1/users/me/gdpr-delete`
(`UsersController.gdprDeleteAccount` → `UsersService.gdprDeleteAccount`,
[`users.service.ts`](../../src/modules/users/users.service.ts)). This is
the real, comprehensive erasure path, and runs as a single database
transaction (so a failure partway through rolls back everything rather
than leaving the user half-anonymized):

| Data | What happens | Why |
|---|---|---|
| User row (email, name, phone, password) | Anonymized in place (`deleted_<id>@anonymized.local`, names/phone nulled, password replaced with random bytes), then soft-deleted | Keeps the row's `id` stable for referential integrity elsewhere, while removing every identifying field. |
| Reviews authored by the user | Soft-deleted | The review itself (as content about a property/agent) is a business record someone else may rely on; soft-delete removes it from active display without destroying the audit trail. |
| Reviews *about* the user (as reviewee) | Author reference anonymized, comment cleared, review kept | The reviewer's feedback about a now-anonymized user is no longer personally identifying once the comment is cleared. |
| Messages, participants, inquiries | Sender/receiver/participant IDs anonymized | Preserves conversation structure for the other party without retaining the deleted user's identity. |
| Payments | `userId` nulled, record otherwise retained | Financial records have their own retention obligation (tax/audit) independent of the user's erasure request; nulling the FK removes the link to the person without destroying the financial record. |
| Payment schedules, payment methods | Hard-deleted | No independent retention need once the user and their payments are anonymized; a stored payment method is sensitive and has no reason to survive the user. |
| KYC documents | Raw document data wiped; the decision record (approved/rejected, when) retained | Mirrors the dedicated KYC retention window below; a decision outcome is useful for compliance history even after the underlying ID documents are erased. |
| Security events | `userId` nulled, log retained | Security/audit logs need to survive for their own retention period (see Audit Logs below) independent of any single user's erasure request. |
| API keys | Hard-deleted | No reason for a deleted user's API credentials to persist. |
| Audit trail of the erasure itself | A `USER_ERASURE_REQUESTED` audit entry is written, recording what was disposed of | So "did we actually process this erasure request, and when" has its own durable record, separate from the erased data itself. |

## Admin-initiated permanent deletion

Separately, an admin can call `DELETE /api/v1/users/:id/permanent`
(`UsersController.hardDeleteAccount`). **This PR fixes a real bug**: it
previously called `userRepository.softRemove(...)`, TypeORM's soft-delete
method, despite the endpoint's name and its "Delete user account while
preserving history (Admin only)" API docs implying a permanent removal.
No code path in this codebase ever actually hard-deleted a user row until
this fix (now calls `userRepository.remove(...)`, TypeORM's real delete).

**This path does not anonymize related records the way
`gdprDeleteAccount` does.** It can fail with a foreign-key violation for
a user who has payment history
(`payments/entities/payment.entity.ts`'s `User` relation has no
`onDelete` behavior configured, so the database's default `RESTRICT`
applies). That failure is the *correct* outcome: erasing such a user
safely requires the same kind of deliberate per-table handling
`gdprDeleteAccount` already does, which this endpoint does not attempt.
**Use `gdprDeleteAccount` for erasure requests that must succeed for any
user; treat this admin endpoint as a cleanup tool for users with no
related financial/relational data**, not as a general-purpose GDPR
erasure mechanism.

## Automatic, time-based retention

These run without a user or admin request, purely on elapsed time:

| Data | Retention | Mechanism |
|---|---|---|
| Raw KYC documents (post-decision) | 90 days by default, configurable via `KYC_DOCUMENT_RETENTION_DAYS` | [`kyc-retention.config.ts`](../../src/modules/kyc/kyc-retention.config.ts) computes the cutoff; [`kyc-retention.service.ts`](../../src/modules/kyc/kyc-retention.service.ts) runs the purge. Only the raw document is purged; the decision record (approved/rejected) is retained indefinitely for compliance history, matching the behavior described in `gdprDeleteAccount` above. |
| Audit logs (INFO/WARN level) | 90 days by default, `AUDIT_RETENTION_INFO_DAYS`/`AUDIT_RETENTION_WARN_DAYS` | [`audit-retention.service.ts`](../../src/modules/audit/audit-retention.service.ts), runs daily at 2 AM via `@Cron`. |
| Audit logs (ERROR level) | 180 days by default, `AUDIT_RETENTION_ERROR_DAYS` | Same service; longer window since error-level events are more likely to matter in a later investigation. |
| Audit logs (SECURITY level) | 365 days by default, `AUDIT_RETENTION_SECURITY_DAYS` | Same service; the longest window, since security-relevant events (auth failures, permission changes) have the longest realistic investigation lag. |
| Other entity data (general archival) | Configurable per entity type | [`data-archival.service.ts`](../../src/modules/cleanup/data-archival.service.ts)'s `performScheduledArchival`/`archiveEntityData` move aged rows to a parallel archive table rather than deleting them outright; see that file for which entity types are currently configured. |

## What is *not* yet covered (disclosed gaps)

- **No consolidated, per-table retention schedule for every entity in
  the schema.** The table above covers the mechanisms that exist today;
  it does not claim every table has an explicit, enforced retention
  period. Tables with no listed mechanism above (e.g. most property,
  agreement, and booking records) are retained indefinitely by default,
  which may or may not be the intended policy, but is not a documentation
  gap, it is simply the current real behavior.
- **`hardDeleteAccount`'s interaction with related financial data is a
  real-but-narrow fix in this PR** (it now actually deletes instead of
  soft-deleting), not a redesign of that endpoint to handle cascading
  anonymization the way `gdprDeleteAccount` does. If this endpoint needs
  to succeed for users with payment history too, that is separate,
  larger scoped work.
- **Smart contract state is not covered by any of the above.** On-chain
  data (agreements, escrows, disputes recorded in the Soroban contracts)
  is immutable by the nature of a blockchain; this document only covers
  the backend database. See
  [`CONTRACT_INTERFACE_REFERENCE.md`](../contracts/CONTRACT_INTERFACE_REFERENCE.md)
  for what on-chain state exists; there is currently no policy
  document, and likely cannot be a deletion mechanism, for on-chain
  personal data, which is itself a GDPR consideration worth flagging to
  whoever owns compliance strategy for this product (storing personal
  data on an immutable ledger is a known, hard GDPR tension), not
  something this PR resolves.
