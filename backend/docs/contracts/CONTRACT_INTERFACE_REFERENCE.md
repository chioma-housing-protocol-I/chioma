# Smart Contract Interface Reference

Reference documentation for the 8 Soroban (Rust) contracts under
`contract/contracts/`. The core `chioma` contract is documented in full
depth (state, every public function grouped by concern, key events, and
real usage scenarios); the other 7 get a summary table of their public
surface, since exhaustive per-function scenarios across all 8 would be a
much larger effort than this doc attempts. See the relevant ADR in
`docs/adr/` for *why* a given contract exists (e.g.
[`0004-soroban-multi-contract.md`](../../../docs/adr/0004-soroban-multi-contract.md)
for why there are 8 separate contracts rather than one).

## Table of Contents

1. [`chioma` (core)](#chioma-core) — full reference
2. [Other contracts](#other-contracts) — summary tables
   - [`escrow`](#escrow)
   - [`payment`](#payment)
   - [`dispute_resolution`](#dispute_resolution)
   - [`rent_obligation`](#rent_obligation)
   - [`agent_registry`](#agent_registry)
   - [`property_registry`](#property_registry)
   - [`user_profile`](#user_profile)

---

## `chioma` (core)

Source: `contract/contracts/chioma/src/`. The central contract: owns rent
agreements, their lifecycle, multi-sig/timelock-gated admin actions,
token support, exchange rates, deposit interest, royalties, and rate
limiting. 98 public functions, grouped below by concern rather than
listed in file order.

### State

```rust
pub struct Config {
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

pub struct ContractState {
    pub admin: Address,
    pub config: Config,
    pub initialized: bool,
}
```

The core agreement record (`RentAgreement`) carries the full lifecycle:

```rust
pub struct RentAgreement {
    pub agreement_id: String,
    pub admin: Address,          // the landlord/admin party
    pub user: Address,           // the tenant
    pub agent: Option<Address>,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
    pub status: AgreementStatus,
    pub total_rent_paid: i128,
    pub payment_count: u32,
    pub signed_at: Option<u64>,
    pub witness_id: Option<Address>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub metadata_uri: String,
    pub attributes: Vec<Attribute>,
}

pub enum AgreementStatus {
    Draft, Pending, PendingApproval, Active,
    Completed, Cancelled, Terminated, Disputed,
}
```

### Agreement lifecycle

```
Draft --submit_agreement--> Pending --sign_agreement--> PendingApproval
  --approve_agreement--> Active --(various)--> Completed / Terminated / Disputed
```

| Function | Who calls | Transition | Notes |
|---|---|---|---|
| `create_agreement(input)` | Admin/landlord | → `Draft` | Creates the record; not yet visible to the tenant workflow. |
| `submit_agreement(admin, agreement_id)` | Landlord (must authorize) | `Draft` → `Pending` | Makes the draft available for the tenant to sign. |
| `sign_agreement(user, agreement_id)` | Tenant (must authorize) | `Pending` → `PendingApproval` | Tenant's commitment; a witness must still approve before activation. |
| `approve_agreement(approver, agreement_id)` | Admin or designated agent (must authorize) | `PendingApproval` → `Active` | Permanently records the witness's ID; payouts can't trigger before this succeeds. |
| `cancel_agreement(caller, agreement_id)` | Landlord | `Draft`/`Pending` → `Cancelled` | Only while still in Draft or Pending. |
| `propose_extension` / `accept_extension` / `reject_extension` / `activate_extension` / `cancel_extension` | Landlord proposes, tenant accepts/rejects | Extends `end_date` on an `Active` agreement | Separate approval flow from the initial signing; see `get_extension`/`get_extension_history` to inspect state. |

**Scenario: a tenant moves in.**
1. Landlord calls `create_agreement` with the terms, then `submit_agreement` to make it signable.
2. Tenant calls `sign_agreement`. The agreement is now `PendingApproval`, not yet active.
3. A witness (admin or the landlord's designated agent) calls `approve_agreement`. The agreement becomes `Active`; `next_payment_due` is set and payments can now be made against it.
4. Each `make_payment_with_token` call updates `total_rent_paid` and `payment_count`, and on-time payment logic in `payment` (the separate contract) can read this agreement's state via cross-contract calls.

### Admin governance (multi-sig + timelock)

`chioma` requires *both* multi-sig approval and, for a known set of
sensitive action types, a minimum timelock delay before an admin action
takes effect — see [`timelock.rs`](../../../contract/contracts/chioma/src/timelock.rs)
for the exact per-action-type delays (7 days for admin rotation, 3 days
for config changes, 2 days for rate changes, 1 day to pause, 1 hour to
unpause).

| Function | Purpose |
|---|---|
| `initialize_multisig(admins, required_signatures)` | Set up the admin set and signature threshold. |
| `propose_action` / `approve_action` / `execute_action` / `reject_action` | Generic multi-sig proposal flow for admin actions not covered by the dedicated upgrade/timelock paths below. |
| `add_admin` / `remove_admin` / `update_required_signatures` | Change the admin set or threshold (itself goes through the proposal flow). |
| `queue_timelock_action` / `execute_timelock_action` / `cancel_timelock_action` | Queue a delayed sensitive action, execute once its ETA passes, or cancel before it does. |
| `accept_admin_transfer` | Second step of a two-step admin rotation: the *new* admin must call this themselves once the timelock ETA has passed, so a proposed transfer can't complete without the intended recipient's consent. |

**Scenario: rotating the admin key.** The current admin calls
`queue_timelock_action` with `UpdateAdmin` and the new admin's address;
this starts a 7-day timer. Either admin can `cancel_timelock_action`
before it fires. Once the 7 days pass, the *new* admin (not the old one)
calls `accept_admin_transfer`, proving control of that address before
the rotation actually applies.

### Contract upgrade

| Function | Purpose |
|---|---|
| `propose_contract_upgrade(proposer, id, wasm_hash, notes, delay)` | Propose a new WASM hash; starts a multi-sig + eta-gated approval. |
| `approve_contract_upgrade(approver, id)` | Add an approval; needs `required_signatures` total. |
| `execute_contract_upgrade(executor, id, new_version)` | Once due and sufficiently approved, calls `env.deployer().update_current_contract_wasm(...)`, the real code swap. Instance/persistent storage is preserved. |
| `migrate()` | Admin-only; run once after an upgrade if the new WASM's `STORAGE_VERSION` is higher than what's stored, to migrate storage layout. Idempotent if already current. |
| `get_version` / `record_version` / `get_version_history` | Track deployed version metadata. |

### Tokens, exchange rates, and payments-in-kind

| Function | Purpose |
|---|---|
| `add_supported_token` / `remove_supported_token` / `get_supported_tokens` / `is_token_supported` | Manage which Stellar assets agreements can be denominated/paid in. |
| `set_exchange_rate` / `get_exchange_rate` / `update_exchange_rates` / `convert_amount` | Cross-token conversion, used when a payment comes in a different asset than the agreement's `payment_token`. |
| `create_agreement_with_token` / `get_agreement_token` / `make_payment_with_token` / `release_escrow_with_token` | Token-aware variants of the core agreement/payment flow. |
| `freeze_escrow` / `unfreeze_escrow` / `is_escrow_frozen` | Emergency freeze on a specific escrow (e.g. during a dispute), independent of the contract-wide pause. |

### Deposit interest, royalties, rate limiting, gas estimation

- **Deposit interest**: `set_deposit_interest_config`, `accrue_interest`,
  `distribute_interest`, `process_interest_accruals` (batch-processes all
  due accruals), `get_accrual_history`.
- **Royalties**: `set_royalty`, `calculate_royalty`,
  `transfer_with_royalty`, `get_royalty_payments` — for metadata/NFT-style
  transfers that owe a royalty split.
- **Rate limiting**: `set_rate_limit_config`, `get_user_call_count`,
  `get_block_call_count`, `reset_user_rate_limit` — per-user and
  per-block call limits on specific functions.
- **Gas estimation**: `estimate_gas_cost`, `get_gas_metrics`,
  `optimize_operation` — introspection helpers, not part of the core
  agreement flow.

### Pause controls

- `pause(reason)` / `unpause()` / `is_paused()`: contract-wide.
- `pause_function(function, reason)` / `unpause_function(function)` /
  `is_function_paused(function)`: pause a single function by its Soroban
  `Symbol` name, without halting the whole contract.

### Events (representative; 48 total)

Events follow a `{entity}_{action}` naming convention, e.g.:
`agreement_created`, `agreement_signed`, `agreement_approved`,
`booking_created`, `action_approved` (multi-sig), `upgrade_approved`,
`timelock_action_queued`/`_executed`/`_cancelled`,
`admin_transfer_accepted`, `interest_accrued`. Each event's exact topic
list and payload are defined next to its emitting function in
[`events.rs`](../../../contract/contracts/chioma/src/events.rs); consult
that file directly when integrating against a specific event, since
listing all 48 payloads here would duplicate it without adding
information.

---

## Other contracts

### `escrow`

Manages security deposit escrows with a 2-of-3 multi-sig release
mechanism and dispute delegation to `dispute_resolution`. 64 public
functions; grouped highlights:

| Function | Purpose |
|---|---|
| `create` / `fund_escrow` | Create an escrow and deposit funds into it. |
| `approve_release` / `approve_partial_release` / `release_escrow_partial` / `release_with_deduction` | The core release flow: approvals from depositor/beneficiary/arbiter, full or partial release, optional deduction (e.g. for damages). |
| `initiate_dispute` / `resolve_dispute_from_arbitration` | Delegates dispute handling to the `dispute_resolution` contract via cross-contract call rather than resolving disputes itself. |
| `release_escrow_on_timeout` / `resolve_dispute_on_timeout` | Time-based fallbacks if a party never responds. |
| `freeze_escrow` / `unfreeze_escrow` / `is_escrow_frozen` | Emergency freeze, independent of release/dispute state. |
| `release_rent` / `withdraw_safety_deposit` / `get_total_governance_fees` | Rent-specific release path with a platform governance fee split. |
| `initialize_admin` / `update_admin` / `pause` / `unpause` | Standard admin/pause controls. |
| `propose_upgrade` / `approve_upgrade` / `execute_upgrade` / `get_upgrade_proposal` | Contract upgrade (see this PR's sibling work in #2084 fixing `execute_upgrade` to actually perform the wasm swap in this contract). |
| `queue_timelock_action` / `execute_timelock_action` / `cancel_timelock_action` | Generic timelock for sensitive operations (added for #2085; narrower than `chioma`'s per-action-type delays — a single fixed minimum delay). |

### `payment`

Recurring and one-off rent payments, late fees, and rent escalation. 34
public functions; grouped highlights:

| Function | Purpose |
|---|---|
| `pay_rent` | One-off payment against an agreement. |
| `create_recurring_payment` / `execute_recurring_payment` / `pause_recurring_payment` / `resume_recurring_payment` / `cancel_recurring_payment` | Standing-order-style recurring payments. |
| `process_due_payments` / `get_due_payments` | Batch-processes all payments currently due. |
| `retry_failed_payment` / `get_failed_payments` | Failure recovery for recurring payments. |
| `set_late_fee_config` / `calculate_late_fee` / `apply_late_fee` / `waive_late_fee` / `get_late_fee_record` | Late fee policy and application. |
| `set_rent_escalation_config` / `calculate_rent_for_period` | Scheduled rent increases over a lease term. |
| `get_payment` / `get_payment_count` / `get_total_paid` / `get_payment_split` | Read-side queries. |

### `dispute_resolution`

Arbiter-based dispute voting with a weighted-voting variant and an
appeal process. 28 public functions; grouped highlights:

| Function | Purpose |
|---|---|
| `add_arbiter` / `set_arbiter_stats` | Manage the arbiter pool and their track record (feeds voting weight). |
| `raise_dispute` / `vote_on_dispute` / `resolve_dispute` / `resolve_dispute_on_timeout` | Baseline one-vote-per-arbiter dispute flow. |
| `vote_on_dispute_weighted` / `resolve_dispute_weighted` / `calculate_voting_weight` / `get_voting_weight` / `get_dispute_votes_weighted` | Weighted variant: an arbiter's vote counts proportionally to their track record. |
| `create_appeal` / `vote_on_appeal` / `resolve_appeal` / `cancel_appeal` / `get_appeal` | Appeal a resolved dispute to a (presumably larger/different) arbiter panel. |
| `get_dispute` / `get_arbiter` / `get_arbiter_count` / `get_vote` | Read-side queries. |

### `rent_obligation`

NFT-style on-chain representation of a tenant's rent obligation,
transferable and burnable. 21 public functions; grouped highlights:

| Function | Purpose |
|---|---|
| `mint_obligation` | Create the obligation NFT, tied to an agreement. |
| `transfer_obligation` / `admin_reassign_obligation` | Move ownership (e.g. subletting, or admin correction). |
| `burn_nft(token_id, reason)` / `can_burn` / `get_burn_record` / `get_burned_nfts` | End-of-life: burn with a recorded reason (e.g. lease completed), auditable per owner. |
| `get_obligation` / `get_obligation_owner` / `has_obligation` / `get_obligation_count` | Read-side queries. |

### `agent_registry`

Registers and rates rental agents. 14 public functions:

| Function | Purpose |
|---|---|
| `register_agent` / `verify_agent` | Onboard an agent; verification is a separate, admin-gated step. |
| `rate_agent` | A transaction party rates the agent after the fact; rejects raters who weren't actually part of that transaction. |
| `register_transaction` / `complete_transaction` | Track which transactions an agent was involved in, feeding their rating eligibility. |
| `get_agent_info` / `get_agent_count` | Read-side queries. |

### `property_registry`

Registers rental properties and tracks landlord ownership. 13 public
functions:

| Function | Purpose |
|---|---|
| `register_property` / `verify_property` | Onboard a property listing; verification is separate. |
| `transfer_property` | Change the recorded landlord; rejects if the caller isn't the actual current landlord. |
| `update_property_metadata` | Update the metadata hash; same landlord-only check as transfer. |
| `get_property` / `has_property` / `get_property_count` | Read-side queries. |

### `user_profile`

On-chain user profile with admin-gated verification. 14 public
functions:

| Function | Purpose |
|---|---|
| `create_profile` / `update_profile` / `delete_profile` | Profile CRUD, scoped to the caller's own `account_id`. |
| `verify_profile` / `unverify_profile` | Admin-only identity verification flag, separate from the backend's own off-chain KYC flow (see `backend/src/modules/kyc/kyc.service.ts`), which performs the actual identity-document verification. |
| `get_profile` / `has_profile` | Read-side queries. |
