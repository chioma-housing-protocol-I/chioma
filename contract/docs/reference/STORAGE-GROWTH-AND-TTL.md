# Storage Growth & TTL Policy

**Status:** Completed
**Category:** Documentation
**Type:** Reference Guide

## Overview

Soroban charges rent on persistent contract state. If a persistent key's TTL
(time-to-live, measured in ledgers) expires, the entry is archived and reads
fail until it's restored, which costs more than periodic TTL extension would
have. Every contract in this workspace stores growable data, so this document
records, per contract:

1. Which storage tier each entity uses (instance / persistent / temporary).
2. Whether its TTL is actively extended, and where.
3. Whether the entity can grow unboundedly, and if so, what bound (if any)
   is enforced.

This complements [STORAGE-KEYS.md](STORAGE-KEYS.md), which documents key
naming, not TTL or growth behavior.

## 1. Storage tier convention

All 9 contracts follow the same tier split:

| Tier | Used for | TTL handling |
|---|---|---|
| `instance()` | Admin address, initialization flag, counters, config singletons | One `env.storage().instance().extend_ttl(500_000, 500_000)` call per contract-level write; extends the whole contract instance, not per-key |
| `persistent()` | Entity records (agreements, escrows, disputes, profiles, obligations, proposals) | Must call `env.storage().persistent().extend_ttl(&key, 500_000, 500_000)` after every `set()` on that key |
| `temporary()` | Rate-limit block/day counters (`rate_limit.rs`, identical pattern in every contract) | Auto-expires; no manual extension needed, by design |

`500_000` ledgers (~roughly a month at Stellar's ~5s average ledger close
time) is the workspace-wide threshold/bump convention. Match it for any new
persistent write unless there's a specific reason to diverge.

## 2. Per-contract TTL audit (as of this doc)

| Contract | Persistent entity writes extend TTL? | Notes |
|---|---|---|
| `property_registry` | Yes | Inline in `property.rs` per write |
| `agent_registry` | Yes | Inline in `agent.rs` per write |
| `rent_obligation` | Yes | Inline per write |
| `dispute_resolution` | Yes | Inline in `dispute.rs` per write |
| `chioma` | Yes | Uses named `TTL_THRESHOLD`/`TTL_BUMP` consts in `agreement.rs` |
| `upgrade_registry` | Yes | Every `persistent().set()` in `lib.rs` is immediately followed by `extend_ttl` |
| `escrow` | **Fixed in #1683** | `EscrowStorage`'s writer methods (`save`, `add_approval`, `increment_approval_count`, `set_signer_approved`, `add_release_record`, `set_timeout_config`, `set_admin`, `increment_count`) previously never called `extend_ttl` at all |
| `payment` | **Fixed in #1683** | `RecurringPayment`, `PaymentExecutions`, `LateFeeConfig`, `LateFeeRecord`, `RentEscalationConfig`, `FailedRecurringPayments`, and the `Agreement`/`PaymentRecord` writes in `payment_impl.rs` previously never extended TTL; added a shared `storage::extend_persistent_ttl` helper since writes are spread across `lib.rs` and `payment_impl.rs` rather than centralized |
| `user_profile` | **Fixed in #1683** | `Profile` writes in `create_profile`/`update_profile`/`verify_profile`/`unverify_profile` previously never extended TTL |

Before this issue, an escrow, a recurring payment, a user profile, or a late
fee record could stop receiving writes (e.g. an escrow sitting `Funded` while
both parties wait out a dispute window) and be archived out from under an
otherwise-open position. Reading it back would fail until manually restored.

## 3. Unbounded growth audit

Every `Vec`/`Map` used as an append-only list was checked for a size bound.
Most are bounded implicitly by the domain (e.g. a 2-of-3 multi-sig's approval
list can't realistically exceed a handful of entries, and governance lists
like `upgrade_registry`'s admin set are small by construction). The two
identified as genuinely unbounded over the lifetime of a single long-lived
entity were fixed in #1683:

| Contract | Key | Problem | Fix |
|---|---|---|---|
| `escrow` | `ReleaseHistory(escrow_id)` | Every partial release appended forever, for the life of one escrow | Capped at `MAX_RELEASE_HISTORY = 64`; oldest record is dropped once exceeded |
| `payment` | `PaymentExecutions(recurring_id)` | Every recurring-payment execution appended forever, for a schedule that can run for years (e.g. monthly rent) | Capped at `MAX_PAYMENT_EXECUTIONS = 120`; oldest execution is dropped once exceeded |

Both caps live as named constants next to the storage code
(`EscrowStorage::MAX_RELEASE_HISTORY` in `escrow/src/storage.rs`,
`payment::storage::MAX_PAYMENT_EXECUTIONS`), not magic numbers inline, so a
future contributor changing the retention window only has one place to edit.

Collections intentionally left unbounded, with the reasoning:

- `escrow::Approvals` / `ApprovalCount` / `SignerApproved`: cleared via
  `clear_approvals` once a release target is reached; never accumulates
  across the life of an escrow.
- `payment::FailedRecurringPayments`: entries are removed via
  `remove_failed_payment` on the next successful execution, so it only ever
  holds currently-failing schedules, not history.
- `upgrade_registry::ContractNames` / `RegistryAdmins` /
  `ActiveRotationProposals` / `AdminRotationProposal.approvals`: bounded by
  the number of contracts in the protocol (9) or the number of registry
  admins, both small, fixed-ish, governance-scale values, not user data.
- `dispute_resolution`, `chioma`, `upgrade_registry`'s other history/list
  fields identified during the #1683 audit were not touched, since the acceptance
  criteria for this issue scoped the fix to entities that grow with ordinary
  user activity (escrow releases, recurring payment executions) rather than
  governance-scale or self-pruning lists. If a future contract adds a list
  that grows per-transaction over an entity's lifetime, apply the same
  bounded-append pattern used here.

## 4. Pattern to follow for new persistent writes

```rust
// 1. Extend TTL on every persistent write, right after set().
let key = DataKey::MyEntity(id.clone());
env.storage().persistent().set(&key, &entity);
env.storage().persistent().extend_ttl(&key, 500_000, 500_000);

// 2. If the entity holds an append-only list that grows with ordinary
//    activity (not a governance-scale or self-pruning list), bound it:
const MAX_HISTORY: u32 = 64; // pick a number, document why
history.push_back(record);
while history.len() > MAX_HISTORY {
    history.remove(0);
}
```

## Related Documentation

- [Storage Keys Reference](STORAGE-KEYS.md)
- [Design Patterns Guide](../architecture/DESIGN-PATTERNS.md)
