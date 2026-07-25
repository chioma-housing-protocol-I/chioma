# Event Reference

This document is the canonical reference for events emitted by contracts in `contract/contracts`.
It covers event names/topics, parameters, meanings, usage patterns, examples, and integration guidance.

## Event List

### `agent_registry`

| Event | Topics | Purpose |
| --- | --- | --- |
| `ContractInitialized` | `["initialized"]`, `admin` | Records contract bootstrap and admin assignment. |
| `AgentRegistered` | `["agent_registered"]`, `agent` | Tracks creation of an agent profile. |
| `AgentVerified` | `["agent_verified"]`, `admin`, `agent` | Marks an agent as verified by admin. |
| `AgentRated` | `["agent_rated"]`, `agent`, `rater` | Records reputation score update. |
| `TransactionRegistered` | `["transaction_registered"]`, `transaction_id`, `agent` | Links completed transactions to an agent. |

### `property_registry`

| Event | Topics | Purpose |
| --- | --- | --- |
| `ContractInitialized` | `["initialized"]`, `admin` | Records admin initialization. |
| `PropertyRegistered` | `["property_registered"]`, `landlord`, `property_id` | Emits when a property enters the registry. |
| `PropertyVerified` | `["property_verified"]`, `admin`, `property_id` | Emits when admin verification is completed. |

### `rent_obligation`

| Event | Topics | Purpose |
| --- | --- | --- |
| `ObligationMinted` | `["minted"]`, `landlord` | Signals minting of obligation NFT. |
| `ObligationTransferred` | `["transferred"]`, `from`, `to` | Records ownership transfer of obligation NFT. |
| `NFTBurned` | `["burned"]`, `owner` | Records obligation NFT burn and reason. |

### `user_profile`

| Event | Topics | Purpose |
| --- | --- | --- |
| `Initialized` | `["init"]`, `admin` | Marks contract initialization. |
| `ProfileCreated` | `["profile", "created"]`, `account_id` | Profile created for account. |
| `ProfileUpdated` | `["profile", "updated"]`, `account_id` | Profile data updated. |
| `ProfileVerified` | `["profile", "verified"]`, `account_id` | Verification status switched on. |
| `ProfileUnverified` | `["profile", "unverified"]`, `account_id` | Verification status switched off. |
| `ProfileDeleted` | `["profile", "deleted"]`, `account_id` | Profile removed from storage. |

### `payment`

| Event | Topics | Purpose |
| --- | --- | --- |
| `RentEscalationConfigSet` | `["rent_escalation_config_set"]`, `agreement_id` | Configures annual rent escalation. |
| `LateFeeConfigSet` | `["late_fee_config_set"]`, `agreement_id` | Configures late fee policy. |
| `LateFeeApplied` | `["late_fee_applied"]`, `payment_id` | Captures applied penalty for late payment. |
| `LateFeeWaived` | `["late_fee_waived"]`, `payment_id` | Captures waived late fee and reason. |
| `RecurringPaymentCreated` | `["recurring_payment_created"]`, `recurring_id` | New recurring payment schedule created. |
| `RecurringPaymentExecuted` | `["recurring_payment_executed"]`, `recurring_id` | Recurring payment execution completed. |
| `RecurringPaymentPaused` | `["recurring_payment_paused"]`, `recurring_id` | Recurring schedule paused. |
| `RecurringPaymentResumed` | `["recurring_payment_resumed"]`, `recurring_id` | Recurring schedule resumed. |
| `RecurringPaymentCancelled` | `["recurring_payment_cancelled"]`, `recurring_id` | Recurring schedule cancelled. |
| `RecurringPaymentFailed` | `["recurring_payment_failed"]`, `recurring_id` | Recurring run failed. |
| `rent_paid` (direct publish) | `( "rent_paid", agreement_id )` | Internal payment split event emitted by `pay_rent_with_agent`. |

### `escrow`

| Event | Topics | Purpose |
| --- | --- | --- |
| `EscrowTimeout` | `["escrow_timeout"]`, `escrow_id` | Escrow timed out before expected transition. |
| `DisputeTimeout` | `["dispute_timeout"]`, `escrow_id` | Dispute window in escrow expired. |
| `PartialRelease` | `["partial_release"]`, `escrow_id` | Partial payout from escrow. |
| `DamageDeduction` | `["damage_deduction"]`, `escrow_id` | Deduction applied for damages. |
| `EscrowFrozen` | `["escrow_frozen"]`, `escrow_id` | Escrow frozen for emergency/admin reason. |
| `EscrowUnfrozen` | `["escrow_unfrozen"]`, `escrow_id` | Escrow returned to active state. |
| `RentReleased` | `["rent_released"]`, `escrow_id` | Rent released with beneficiary/governance/agent split. |
| `SafetyDepositWithdrawn` | `["safety_deposit_withdrawn"]`, `escrow_id` | Security deposit withdrawal recorded. |

### `dispute_resolution`

| Event | Topics | Purpose |
| --- | --- | --- |
| `ContractInitialized` | `["initialized"]`, `admin` | Contract setup with voting threshold. |
| `ArbiterAdded` | `["arbiter_added"]`, `admin`, `arbiter` | Arbiter granted dispute voting privileges. |
| `DisputeRaised` | `["dispute_raised"]`, `agreement_id` | New dispute opened. |
| `VoteCast` | `["vote_cast"]`, `agreement_id`, `arbiter` | Standard arbiter vote submitted. |
| `DisputeResolved` | `["dispute_resolved"]`, `agreement_id` | Dispute resolution finalized with tally. |
| `AppealCreated` | `["appeal_created"]`, `appeal_id`, `dispute_id` | Appeal process opened for a dispute. |
| `AppealVoted` | `["appeal_voted"]`, `appeal_id`, `arbiter` | Arbiter vote on appeal submitted. |
| `AppealResolved` | `["appeal_resolved"]`, `appeal_id` | Appeal finalized. |
| `AppealCancelled` | `["appeal_cancelled"]`, `appeal_id` | Appeal cancelled before finalization. |
| `DisputeTimeout` | `["dispute_timeout"]`, `agreement_id` | Resolution deadline hit without completion. |
| `WeightedVoteCast` | `["weighted_vote_cast"]`, `dispute_id`, `arbiter` | Weighted arbiter vote submitted. |
| `DisputeResolvedByWeight` | `["dispute_resolved_by_weight"]`, `dispute_id` | Weighted resolution reached. |

### `chioma`

| Event | Topics | Purpose |
| --- | --- | --- |
| `ContractInitialized` | `["initialized"]`, `admin` | Main protocol contract initialized with config. |
| `AgreementCreated` | `["agreement_created"]`, `user`, `admin` | Agreement drafted with economic terms. |
| `AgreementSigned` | `["agreement_signed"]`, `user`, `admin` | Agreement signature completed. |
| `AgreementSubmitted` | `["agreement_submitted"]`, `admin`, `user` | Agreement submitted for counterpart signing. |
| `AgreementCancelled` | `["agreement_cancelled"]`, `admin`, `user` | Agreement cancelled before activation. |
| `AgreementApproved` | `["agreement_approved"]`, `approver` | Witness/approver moved agreement to active state. |
| `ConfigUpdated` | `["config_updated"]`, `admin` | Protocol fee/collector/pause config changed. |
| `Paused` | `["paused"]`, `paused_by` | Emergency pause engaged. |
| `Unpaused` | `["unpaused"]`, `unpaused_by` | Emergency pause removed. |
| `TokenAdded` | default Soroban topic tuple | Payment token enabled. |
| `TokenRemoved` | default Soroban topic tuple | Payment token disabled. |
| `ExchangeRateUpdated` | default Soroban topic tuple | Conversion rate changed for token pair. |
| `PaymentMadeWithToken` | default Soroban topic tuple | Rent payment settled in configured token. |
| `EscrowReleasedWithToken` | default Soroban topic tuple | Escrow payout released in configured token. |
| `InterestConfigSet` | default Soroban topic tuple | Interest policy configured for agreement/deposit. |
| `InterestAccruedEvent` | default Soroban topic tuple | Incremental interest accrual recorded. |
| `InterestDistributed` | default Soroban topic tuple | Interest split and distributed. |
| `ErrorOccurred` | default Soroban topic tuple | Operational error telemetry emitted. |
| `RoyaltySet` | default Soroban topic tuple | Royalty metadata configured. |
| `RoyaltyPaid` | default Soroban topic tuple | Royalty distribution executed. |
| `RateLimitExceeded` | `["rate_limit_exceeded"]`, `user` | Invocation blocked by rate limiter. |
| `RateLimitConfigUpdated` | default Soroban topic tuple | Rate-limiter thresholds updated. |
| `MultiSigInitialized` | `["multisig_initialized"]` | Multisig governance initialized. |
| `ActionProposed` | `["action_proposed"]`, `proposal_id`, `proposer` | Governance action proposed. |
| `ActionApproved` | `["action_approved"]`, `proposal_id`, `approver` | Governance proposal approved by signer. |
| `ActionExecuted` | `["action_executed"]`, `proposal_id` | Proposal execution completed. |
| `ActionRejected` | `["action_rejected"]`, `proposal_id` | Proposal rejected or invalidated. |
| `AdminAdded` | `["admin_added"]`, `admin` | Admin added to multisig set. |
| `AdminRemoved` | `["admin_removed"]`, `admin` | Admin removed from multisig set. |
| `RequiredSignaturesUpdated` | `["signatures_updated"]` | Multisig threshold changed. |
| `TimelockActionQueued` | `["timelock_queued"]`, `action_id` | Governance action queued with ETA. |
| `TimelockActionExecuted` | `["timelock_executed"]`, `action_id` | Timelock action executed after delay. |
| `TimelockActionCancelled` | `["timelock_cancelled"]`, `action_id` | Timelock action cancelled before execution. |
| `VersionUpdated` | `["version_updated"]` | Protocol version bumped. |
| `ExtensionProposed` | `["extension_proposed"]`, `extension_id` | Lease extension proposal created. |
| `ExtensionAccepted` | `["extension_accepted"]`, `extension_id` | Counterparty accepted extension terms. |
| `ExtensionRejected` | `["extension_rejected"]`, `extension_id` | Counterparty rejected extension terms. |
| `ExtensionActivated` | `["extension_activated"]`, `extension_id` | Accepted extension activated. |
| `ExtensionCancelled` | `["extension_cancelled"]`, `extension_id` | Extension proposal cancelled. |
| `UpgradeProposed` | `["upgrade_proposed"]`, `proposal_id` | Upgrade proposal queued with execution ETA. |
| `UpgradeApproved` | `["upgrade_approved"]`, `proposal_id` | Upgrade proposal reached approval count. |
| `UpgradeExecuted` | `["upgrade_executed"]`, `proposal_id` | Upgrade execution completed. |

## Event Parameters

### Parameter Type Conventions

- `Address`: Stellar address, typically actor identity (`admin`, `user`, `agent`, `arbiter`).
- `String`: Logical identifiers (`agreement_id`, `proposal_id`, `payment_id`) or reason/metadata hash.
- `Bytes`: Opaque payload hashes (used in profile data hash).
- `BytesN<32>`: Fixed-length escrow identifiers.
- `u32`: Counts, percentages in basis points, thresholds, votes, and versions.
- `u64`: Timestamps and epoch values.
- `i128`: Token/asset amounts.
- `bool`: Binary vote/flag values (for example `favor_landlord`, `paused`).
- Enum payloads:
  - `DisputeOutcome` in dispute resolution result events.
  - `ActionType` in multisig proposal lifecycle events.
  - `RateLimitReason` in rate-limit rejections.
  - `AccountType` in user profile events.

### Cross-Contract Parameter Map

| Parameter | Meaning |
| --- | --- |
| `agreement_id` | Core lease agreement identifier shared across payment, dispute, and agreement events. |
| `escrow_id` | Escrow lifecycle identifier (`BytesN<32>` in `escrow`, `String` in tokenized chioma escrow events). |
| `proposal_id` / `action_id` / `extension_id` | Governance and lifecycle IDs for multisig/timelock/upgrade/extension flows. |
| `amount`, `monthly_rent`, `security_deposit`, `user_share`, `admin_share`, `beneficiary_share` | Monetary values emitted as `i128`. |
| `details_hash`, `metadata_hash`, `data_hash` | Off-chain payload references for auditability and privacy. |
| `timestamp`, `signed_at`, `executed_at`, `eta`, `minted_at` | Ledger-time lifecycle markers used for ordering and SLA checks. |

## Event Meanings

- Initialization events define authoritative contract bootstrap state and admin identity.
- Agreement/property/profile creation and update events establish canonical lifecycle transitions.
- Payment/escrow events represent money movement intent and split accounting (beneficiary/governance/agent).
- Dispute and appeal events map decision workflows from raise -> vote -> resolve/cancel/timeout.
- Governance events (multisig/timelock/upgrade) model control-plane changes and delayed execution safety.
- Safety and policy events (`Paused`, `RateLimitExceeded`, `ErrorOccurred`) provide operational telemetry and incident context.

## Event Usage

- **State reconstruction:** Indexers can rebuild high-level lifecycle state by replaying events in ledger order.
- **Compliance/audit:** `admin`, `approver`, `arbiter`, and `proposal_id` topics are sufficient for governance and review trails.
- **User notifications:** Wallet/app UX can subscribe to account-bound topics (`user`, `tenant`, `landlord`, `account_id`).
- **Dispute automation:** Off-chain workers can watch timeout and appeal events to trigger escalations.
- **Treasury analytics:** Amount-bearing events (`RentReleased`, `RoyaltyPaid`, `PaymentMadeWithToken`) enable revenue dashboards.

## Patterns

### 1. Lifecycle Pattern

Most modules follow `created/submitted -> approved/signed -> completed/cancelled/failed/timeout`.
Examples: agreements, appeals, recurring payments, extensions, upgrades.

### 2. Governance Pattern

`proposed -> approved (N times) -> executed` optionally guarded by timelocks.

### 3. Safety Pattern

Emergency and policy controls emit explicit observability signals: pause/unpause, freeze/unfreeze, rate-limit, error.

### 4. Topic-First Query Pattern

Topic fields prioritize high-cardinality lookup keys (`agreement_id`, `proposal_id`, `escrow_id`, `account_id`) for fast filtering.

## Examples

### Example 1: Monitor Agreement Lifecycle

1. Watch `AgreementCreated` for new agreements.
2. Match by `agreement_id` and await `AgreementSubmitted`, `AgreementSigned`, `AgreementApproved`.
3. Close tracking on `AgreementCancelled` or activation completion.

### Example 2: Detect and React to Payment Problems

1. Subscribe to `RecurringPaymentFailed` and `LateFeeApplied`.
2. Enrich with `agreement_id`/`payment_id` metadata from storage or app DB.
3. Notify tenant/admin and optionally trigger dispute workflow if threshold exceeded.

### Example 3: Governance Execution Pipeline

1. Capture `ActionProposed` and `TimelockActionQueued`.
2. Count unique `ActionApproved` by `proposal_id`.
3. Mark proposal terminal on `ActionExecuted` or `ActionRejected`.

### Example 4: Direct Event Emission (`rent_paid`)

`payment_impl::pay_rent_with_agent` uses direct low-level publish:

```rust
env.events().publish(
    (String::from_str(&env, "rent_paid"), agreement_id),
    (amount, landlord_amount, agent_amount, timestamp),
);
```

Use this as a tuple-topic event with data payload ordering:
`(amount, landlord_amount, agent_amount, timestamp)`.

## Best Practices

- Emit one event per externally meaningful state transition.
- Keep stable topic keys for queryability (`agreement_id`, `escrow_id`, `proposal_id`, `account_id`).
- Put large/opaque payloads behind hashes (`metadata_hash`, `details_hash`, `data_hash`) instead of full blobs.
- Emit timestamps for time-sensitive flows (timeouts, recurring runs, signatures).
- Treat event schemas as API contracts; avoid breaking field renames/reorders.
- For new events, document topic strategy and add tests validating emission and payload shape.

## Monitoring

- Track event rates per contract and alert on:
  - unexpected spikes in `ErrorOccurred`, `RateLimitExceeded`, `RecurringPaymentFailed`
  - repeated `DisputeTimeout` / `EscrowTimeout`
  - prolonged `ActionProposed` without `ActionExecuted`
- Build SLO dashboards:
  - dispute resolution latency
  - payment success ratio
  - governance execution lead time (queue to execute)

## Filtering

- Filter by contract ID first, then topic string (`"agreement_created"`, `"appeal_resolved"`, etc.).
- Use topic IDs for point-lookups:
  - `agreement_id` for payment/dispute/agreement joins
  - `escrow_id` for escrow lifecycle joins
  - `proposal_id` for governance joins
- Apply time-window filters on emitted timestamps for incremental sync jobs.

## Integration

- Build indexers to decode Soroban contract events into typed application records.
- Normalize event names into `contract.event` convention (for example `chioma.agreement_created`).
- Store both raw event payloads and normalized projections for replay and migration safety.
- Use idempotent upserts keyed by `(ledger, tx_hash, event_index)` to avoid duplication.
- Keep consumer versions tied to schema snapshots; update this document when event contracts evolve.

