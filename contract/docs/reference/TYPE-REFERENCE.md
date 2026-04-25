# Type Definitions Reference

Comprehensive documentation of all custom types and data structures used in the Chioma smart contracts.

## Table of Contents

1. [Overview](#overview)
2. [User Profile Contract](#1-user-profile-contract)
3. [Rent Obligation Contract](#2-rent-obligation-contract)
4. [Property Registry Contract](#3-property-registry-contract)
5. [Payment Contract](#4-payment-contract)
6. [Escrow Contract](#6-escrow-contract)
7. [Dispute Resolution Contract](#7-dispute-resolution-contract)
8. [Agent Registry Contract](#8-agent-registry-contract)
9. [Chioma (Main) Contract](#9-chioma-main-contract)
10. [Shared Types](#10-shared-types)
11. [Serialization](#serialization)
12. [Validation](#validation)
13. [Best Practices](#best-practices)

---

## Overview

All types use the `#[contracttype]` attribute for Soroban persistent storage compatibility. Types are organized by contract.

### Type Categories

| Category | Description |
|---|---|
| **Enums** | Discriminated unions for status, actions, and choices |
| **Structs** | Composite data with named fields |
| **Shared** | Reused across multiple contracts |

---

## 1. User Profile Contract

**Location:** `contracts/user_profile/src/types.rs`

### AccountType

```rust
pub enum AccountType {
    Tenant = 0,
    Landlord = 1,
    Agent = 2,
}
```

Defines user roles in the rental system. Used for access control and role-based permissions.

**Fields:**
- `Tenant` - Renter who pays for property use
- `Landlord` - Property owner who receives rent
- `Agent` - Intermediary facilitating rental agreements

### UserProfile

```rust
pub struct UserProfile {
    pub account_id: Address,       // Stellar account address
    pub version: String,          // Data structure version (e.g., "1.0")
    pub account_type: AccountType,
    pub last_updated: u64,         // Unix timestamp
    pub data_hash: Bytes,          // IPFS CID or SHA-256 hash
    pub is_verified: bool,        // KYC/verification status
}
```

SEP-29 compliant on-chain user profile. Minimal data stored on-chain for gas efficiency.

**Fields:**
- `account_id` - Stellar account address (identifies the user)
- `version` - For future upgrades
- `account_type` - Role classification
- `last_updated` - Last modification timestamp
- `data_hash` - Hash of complete off-chain profile data
- `is_verified` - Whether KYC verification is complete

---

## 2. Rent Obligation Contract

**Location:** `contracts/rent_obligation/src/types.rs`

### RentObligation

```rust
pub struct RentObligation {
    pub agreement_id: String,   // Reference to associated agreement
    pub owner: Address,        // Current owner of the obligation
    pub minted_at: u64,        // Token mint timestamp
}
```

Represents a tokenized rent obligation NFT tracking the rental relationship.

### BurnRecord

```rust
pub struct BurnRecord {
    pub token_id: String,      // ID of burned token
    pub burned_by: Address,    // Address that initiated burn
    pub burned_at: u64,        // Burn timestamp
    pub reason: String,        // Reason for burning
}
```

Tracks when rent obligation NFTs are burned for record-keeping.

---

## 3. Property Registry Contract

**Location:** `contracts/property_registry/src/types.rs`

### PropertyDetails

```rust
pub struct PropertyDetails {
    pub property_id: String,
    pub landlord: Address,
    pub metadata_hash: String,     // IPFS hash of property metadata
    pub verified: bool,            // Verification status
    pub registered_at: u64,
    pub verified_at: Option<u64>,
}
```

Records property registration and verification status.

**Fields:**
- `property_id` - Unique identifier
- `landlord` - Owner address
- `metadata_hash` - Off-chain property details reference
- `verified` - Whether property is verified
- `registered_at` - Registration timestamp
- `verified_at` - When verification occurred (if verified)

### ContractState

```rust
pub struct ContractState {
    pub admin: Address,
    pub initialized: bool,
}
```

Tracks contract initialization state.

---

## 4. Payment Contract

**Location:** `contracts/payment/src/types.rs`

### EscalationType

```rust
pub enum EscalationType {
    FixedAnnual,  // Rate in basis points (500 = 5%)
    None,        // No escalation
}
```

Programmable rent increase configuration.

### RentEscalationConfig

```rust
pub struct RentEscalationConfig {
    pub agreement_id: String,
    pub annual_rate_bps: u32,     // Basis points (1 bps = 0.01%)
    pub payments_per_year: u32,   // e.g., 12 for monthly
    pub escalation_type: EscalationType,
}
```

### LateFeeConfig

```rust
pub struct LateFeeConfig {
    pub agreement_id: String,
    pub late_fee_percentage: u32,  // e.g., 5 = 5%
    pub grace_period_days: u32,    // Days before fee applies
    pub max_late_fee: i128,        // Maximum fee cap
    pub compounding: bool,        // Whether fee compounds daily
}
```

### LateFeeRecord

```rust
pub struct LateFeeRecord {
    pub payment_id: String,
    pub days_late: u32,
    pub base_amount: i128,
    pub late_fee: i128,
    pub total_due: i128,
    pub calculated_at: u64,
    pub waived: bool,
    pub waive_reason: Option<String>,
}
```

### PaymentRecord

```rust
pub struct PaymentRecord {
    pub agreement_id: String,
    pub payment_number: u32,
    pub amount: i128,
    pub landlord_amount: i128,
    pub agent_amount: i128,
    pub timestamp: u64,
    pub tenant: Address,
}
```

### PaymentSplit

```rust
pub struct PaymentSplit {
    pub landlord_amount: i128,
    pub platform_amount: i128,
    pub token: Address,
    pub payment_date: u64,
}
```

### AgreementStatus

```rust
pub enum AgreementStatus {
    Draft,
    Pending,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}
```

### RentAgreement

```rust
pub struct RentAgreement {
    pub agreement_id: String,
    pub landlord: Address,
    pub tenant: Address,
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
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub payment_history: Map<u32, PaymentSplit>,
}
```

### PaymentFrequency

```rust
pub enum PaymentFrequency {
    Daily,
    Weekly,
    BiWeekly,
    Monthly,
    Quarterly,
    Annually,
}
```

### RecurringStatus

```rust
pub enum RecurringStatus {
    Active,
    Paused,
    Completed,
    Cancelled,
    Failed,
}
```

### RecurringPayment

```rust
pub struct RecurringPayment {
    pub id: String,
    pub agreement_id: String,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub frequency: PaymentFrequency,
    pub start_date: u64,
    pub end_date: u64,
    pub next_payment_date: u64,
    pub status: RecurringStatus,
    pub auto_renew: bool,
}
```

### ExecutionStatus

```rust
pub enum ExecutionStatus {
    Success,
    Failed,
    Pending,
}
```

### RecurringPaymentEvent

```rust
pub enum RecurringPaymentEvent {
    RecurringPaymentCreated { recurring_id: String, agreement_id: String, amount: i128 },
    RecurringPaymentExecuted { recurring_id: String, executed_at: u64 },
    RecurringPaymentPaused { recurring_id: String },
    RecurringPaymentResumed { recurring_id: String },
    RecurringPaymentCancelled { recurring_id: String },
    RecurringPaymentFailed { recurring_id: String },
}
```

### RateLimitConfig

```rust
pub struct RateLimitConfig {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}
```

### UserCallCount

```rust
pub struct UserCallCount {
    pub user: Address,
    pub call_count: u32,
    pub last_call_block: u64,
    pub daily_count: u32,
    pub daily_reset_block: u64,
}
```

---

## 6. Escrow Contract

**Location:** `contracts/escrow/src/types.rs`

### EscrowStatus

```rust
pub enum EscrowStatus {
    Pending = 0,    // Created, not yet funded
    Funded = 1,     // Funds deposited
    Released = 2,   // Funds released to beneficiary
    Refunded = 3,   // Funds refunded to depositor
    Disputed = 4,   // Under dispute
}
```

### Escrow

```rust
pub struct Escrow {
    pub id: BytesN<32>,
    pub depositor: Address,           // Tenant
    pub beneficiary: Address,         // Landlord/admin
    pub arbiter: Address,            // Dispute resolver
    pub platform_governance: Address, // 5% on rent release
    pub agent_referral: Address,      // 5% on rent release
    pub amount: i128,
    pub token: Address,              // USDC, XLM, etc.
    pub status: EscrowStatus,
    pub created_at: u64,
    pub timeout_days: u64,
    pub disputed_at: Option<u64>,
    pub dispute_reason: Option<String>,
    pub is_frozen: bool,
    pub frozen_at: Option<u64>,
    pub freeze_reason: Option<String>,
}
```

2-of-3 multi-sig security deposit escrow.

### TimeoutConfig

```rust
pub struct TimeoutConfig {
    pub escrow_timeout_days: u64,
    pub dispute_timeout_days: u64,
    pub payment_timeout_days: u64,
}
```

### ReleaseApproval

```rust
pub struct ReleaseApproval {
    pub signer: Address,
    pub release_to: Address,   // Beneficiary or depositor
    pub timestamp: u64,
}
```

### ReleaseRecord

```rust
pub struct ReleaseRecord {
    pub escrow_id: BytesN<32>,
    pub amount: i128,
    pub recipient: Address,
    pub released_at: u64,
    pub reason: String,
}
```

### DataKey

```rust
pub enum DataKey {
    Escrow(BytesN<32>),
    Approvals(BytesN<32>),
    DisputeInfo(BytesN<32>),
    EscrowCount,
    ApprovalCount(BytesN<32>, Address),
    SignerApproved(BytesN<32>, Address, Address),
    TimeoutConfig,
    ReleaseHistory(BytesN<32>),
    RateLimitConfig,
    UserCallCount(Address, String),
    BlockCallCount(u64, String),
    SystemAdmin,
}
```

Storage key variants for persistent storage.

---

## 7. Dispute Resolution Contract

**Location:** `contracts/dispute_resolution/src/types.rs`

### ArbiterStats

```rust
pub struct ArbiterStats {
    pub rating: u32,              // 0-100
    pub disputes_resolved: u32,
}
```

Admin-set stats for voting weight calculation.

### VotingWeight

```rust
pub struct VotingWeight {
    pub arbiter: Address,
    pub base_weight: u32,           // Always 100
    pub rating_multiplier: u32,      // rating x 2 (0-200)
    pub experience_multiplier: u32,  // min(resolved x 2, 200)
    pub total_weight: u32,           // base x rating_mult/100 x exp_mult/100
}
```

Computed voting weight. Multipliers stored scaled x100.

### WeightedVote

```rust
pub struct WeightedVote {
    pub arbiter: Address,
    pub vote: DisputeOutcome,
    pub weight: u32,
    pub timestamp: u64,
}
```

### WeightedDisputeVotes

```rust
pub struct WeightedDisputeVotes {
    pub weighted_votes_favor_landlord: u32,
    pub weighted_votes_favor_tenant: u32,
    pub voters: Vec<Address>,  // voters[0] for tie-breaking
}
```

### DisputeOutcome

```rust
pub enum DisputeOutcome {
    FavorLandlord,
    FavorTenant,
}
```

### ContractState

```rust
pub struct ContractState {
    pub admin: Address,
    pub initialized: bool,
    pub min_votes_required: u32,
    pub chioma_contract: Address,
}
```

### Arbiter

```rust
pub struct Arbiter {
    pub address: Address,
    pub added_at: u64,
    pub active: bool,
}
```

### Dispute

```rust
pub struct Dispute {
    pub agreement_id: String,
    pub details_hash: String,
    pub raised_at: u64,
    pub resolved: bool,
    pub resolved_at: Option<u64>,
    pub votes_favor_landlord: u32,
    pub votes_favor_tenant: u32,
    pub voters: Vec<Address>,
}
```

### Vote

```rust
pub struct Vote {
    pub arbiter: Address,
    pub agreement_id: String,
    pub favor_landlord: bool,
    pub voted_at: u64,
}
```

### AppealStatus

```rust
pub enum AppealStatus {
    Pending,
    InProgress,
    Approved,
    Rejected,
    Cancelled,
}
```

### AppealVote

```rust
pub struct AppealVote {
    pub arbiter: Address,
    pub vote: DisputeOutcome,
    pub timestamp: u64,
}
```

### DisputeAppeal

```rust
pub struct DisputeAppeal {
    pub id: String,
    pub dispute_id: String,
    pub appellant: Address,
    pub reason: String,
    pub status: AppealStatus,
    pub appeal_arbiters: Vec<Address>,
    pub votes: Vec<AppealVote>,
    pub created_at: u64,
    pub resolved_at: Option<u64>,
}
```

### RateLimitReason

```rust
pub enum RateLimitReason {
    BlockLimitExceeded,
    DailyLimitExceeded,
    CooldownNotMet,
}
```

---

## 8. Agent Registry Contract

**Location:** `contracts/agent_registry/src/types.rs`

### AgentInfo

```rust
pub struct AgentInfo {
    pub agent: Address,
    pub external_profile_hash: String,
    pub verified: bool,
    pub registered_at: u64,
    pub verified_at: Option<u64>,
    pub total_ratings: u32,
    pub total_score: u32,
    pub completed_agreements: u32,
}
```

**Computed:** `average_rating()` = `total_score / total_ratings`

### Rating

```rust
pub struct Rating {
    pub rater: Address,
    pub agent: Address,
    pub score: u32,
    pub rated_at: u64,
}
```

### AgentTransaction

```rust
pub struct AgentTransaction {
    pub transaction_id: String,
    pub agent: Address,
    pub parties: Vec<Address>,
    pub completed: bool,
}
```

---

## 9. Chioma (Main) Contract

**Location:** `contracts/chioma/src/types.rs`

### TimelockActionType

```rust
pub enum TimelockActionType {
    UpdateAdmin,
    UpdateConfig,
    UpdateRates,
    PauseContract,
    UnpauseContract,
}
```

### TimelockAction

```rust
pub struct TimelockAction {
    pub id: String,
    pub action_type: TimelockActionType,
    pub target: Address,
    pub data: Bytes,
    pub eta: u64,       // Execution timestamp
    pub executed: bool,
    pub cancelled: bool,
}
```

### AgreementStatus

```rust
pub enum AgreementStatus {
    Draft,
    Pending,
    PendingApproval,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}
```

### ExtensionStatus

```rust
pub enum ExtensionStatus {
    Proposed,
    Accepted,
    Rejected,
    Active,
    Completed,
    Cancelled,
}
```

### AgreementExtension

```rust
pub struct AgreementExtension {
    pub id: String,
    pub original_agreement_id: String,
    pub extension_start: u64,
    pub extension_end: u64,
    pub extension_rent: i128,
    pub extension_deposit: i128,
    pub status: ExtensionStatus,
    pub created_at: u64,
    pub proposed_by: Address,
    pub landlord_accepted: bool,
    pub tenant_accepted: bool,
    pub last_reason: Option<String>,
}
```

### ContractUpgradeProposal

```rust
pub struct ContractUpgradeProposal {
    pub id: String,
    pub proposer: Address,
    pub wasm_hash: Bytes,
    pub approvals: Vec<Address>,
    pub required_signatures: u32,
    pub eta: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub notes: String,
    pub created_at: u64,
}
```

### MultiSigConfig

```rust
pub struct MultiSigConfig {
    pub admins: Vec<Address>,
    pub required_signatures: u32,
    pub total_admins: u32,
}
```

### ActionType

```rust
pub enum ActionType {
    Pause,
    Unpause,
    UpdateConfig,
    UpdateRate,
    AddAdmin,
    RemoveAdmin,
    UpdateRequiredSignatures,
    EmergencyAction,
    SetRateLimit,
    AddToken,
    RemoveToken,
}
```

### AdminProposal

```rust
pub struct AdminProposal {
    pub id: String,
    pub proposer: Address,
    pub action_type: ActionType,
    pub target: Option<Address>,
    pub data: Bytes,
    pub approvals: Vec<Address>,
    pub approval_count: u32,
    pub executed: bool,
    pub created_at: u64,
    pub expiry: u64,
}
```

### Attribute

```rust
pub struct Attribute {
    pub trait_type: String,
    pub value: String,
}
```

### RentAgreement

```rust
pub struct RentAgreement {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
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
```

### Config

```rust
pub struct Config {
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}
```

### ContractState

```rust
pub struct ContractState {
    pub admin: Address,
    pub config: Config,
    pub initialized: bool,
}
```

### PauseState

```rust
pub struct PauseState {
    pub is_paused: bool,
    pub paused_at: u64,
    pub paused_by: Address,
    pub pause_reason: String,
}
```

### SupportedToken

```rust
pub struct SupportedToken {
    pub token_address: Address,
    pub symbol: String,
    pub decimals: u32,
    pub enabled: bool,
    pub min_amount: i128,
    pub max_amount: i128,
}
```

### TokenExchangeRate

```rust
pub struct TokenExchangeRate {
    pub from_token: Address,
    pub to_token: Address,
    pub rate: i128,      // Scaled by 10^18
    pub updated_at: u64,
}
```

### CompoundingFrequency

```rust
pub enum CompoundingFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Annually,
}
```

### InterestRecipient

```rust
pub enum InterestRecipient {
    Tenant,
    Landlord,
    Split,  // 50/50
}
```

### DepositInterestConfig

```rust
pub struct DepositInterestConfig {
    pub agreement_id: String,
    pub annual_rate: u32,              // Basis points (0-10000)
    pub compounding_frequency: CompoundingFrequency,
    pub interest_recipient: InterestRecipient,
}
```

### InterestAccrual

```rust
pub struct InterestAccrual {
    pub accrued_at: u64,
    pub amount: i128,
    pub rate: u32,
    pub balance: i128,
}
```

### DepositInterest

```rust
pub struct DepositInterest {
    pub escrow_id: String,
    pub principal: i128,
    pub accrued_interest: i128,
    pub total_with_interest: i128,
    pub last_accrual_date: u64,
    pub accrual_history: Vec<InterestAccrual>,
}
```

### RoyaltyConfig

```rust
pub struct RoyaltyConfig {
    pub token_id: String,
    pub creator: Address,
    pub royalty_percentage: u32,  // Basis points (0-2500 = 0-25%)
    pub royalty_recipient: Address,
}
```

### RoyaltyPayment

```rust
pub struct RoyaltyPayment {
    pub token_id: String,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub royalty_amount: i128,
    pub timestamp: u64,
}
```

### AgreementTerms

```rust
pub struct AgreementTerms {
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,
}
```

### AgreementInput

```rust
pub struct AgreementInput {
    pub agreement_id: String,
    pub admin: Address,
    pub user: Address,
    pub agent: Option<Address>,
    pub terms: AgreementTerms,
    pub payment_token: Address,
    pub metadata_uri: String,
    pub attributes: Vec<Attribute>,
}
```

### VersionStatus

```rust
pub enum VersionStatus {
    Active,
    Deprecated,
    Archived,
}
```

### ContractVersion

```rust
pub struct ContractVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub label: String,
    pub status: VersionStatus,
    pub hash: Bytes,
    pub updated_at: u64,
}
```

### ErrorContext

```rust
pub struct ErrorContext {
    pub error_code: u32,
    pub error_message: String,
    pub details: String,
    pub timestamp: u64,
    pub operation: String,
}
```

---

## 10. Shared Types

These types appear across multiple contracts with consistent definitions.

### RateLimitConfig

| Field | Type | Description |
|---|---|---|
| `max_calls_per_block` | u32 | Maximum calls per block |
| `max_calls_per_user_per_day` | u32 | Maximum calls per user per day |
| `cooldown_blocks` | u32 | Blocks between calls |

### UserCallCount

| Field | Type | Description |
|---|---|---|
| `user` | Address | User address |
| `call_count` | u32 | Current block call count |
| `last_call_block` | u64 | Last call block number |
| `daily_count` | u32 | Daily call count |
| `daily_reset_block` | u64 | Block for daily reset |

### ContractState

| Field | Type | Description |
|---|---|---|
| `admin` | Address | Contract administrator |
| `initialized` | bool | Initialization flag |

---

## Serialization

All types use `#[contracttype]` for Soroban SDK serialization compatibility:

- Types are serialized using Soroban's built-in codec
- Enums use ordinal encoding (first variant = 0)
- Struct fields serialized in declaration order
- `Option<T>` types use 1 byte discriminant + value

### Example Serialization

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementStatus {
    Draft,      // 0
    Pending,    // 1
    Active,     // 2
    // ...
}
```

---

## Validation

### Address Validation

- Use `address.require_auth()` for authentication
- Validate addresses are not zero (empty)

### Amount Validation

- Amounts should be non-negative for most operations
- Use `i128` for token amounts to handle decimals
- Validate against min/max configured amounts

### Timestamp Validation

- Timestamps should be in reasonable range
- Start dates should precede end dates
- Use Unix epoch (seconds since 1970)

### String Validation

- Validate non-empty strings where required
- Use appropriate encoding (String vs Bytes)

---

## Best Practices

### 1. Always Use `#[contracttype]`

All persistent storage types must have the `#[contracttype]` attribute for proper serialization.

### 2. Derive Clone, Debug, Eq, PartialEq

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MyType { ... }
```

### 3. Use Meaningful Field Names

Field names should clearly indicate purpose. Avoid abbreviations.

### 4. Document Unclear Types

Add doc comments explaining the purpose of complex types.

### 5. Use Basis Points for Rates

Use `u32` basis points (1/100 of 1%) for rates rather than decimals:
- 500 bps = 5%
- 10000 bps = 100%

### 6. Use i128 for Token Amounts

Token amounts with decimals should use `i128` to handle negative values (refunds).

### 7. Timestamps as u64

Use `u64` for Unix timestamps (seconds since epoch).

### 8. Use Option for Optional Fields

Fields like `verified_at` should use `Option<u64>` instead of sentinel values.

### 9. Separate State from Data

Keep `ContractState` minimal:
```rust
pub struct ContractState {
    pub admin: Address,
    pub initialized: bool,
}
```

### 10. Use Enums for Status

Use enums for status fields instead of strings:
```rust
pub enum EscrowStatus {
    Pending,
    Funded,
    Released,
    Refunded,
    Disputed,
}
```

---

## Related Documentation

- [Storage Keys Reference](./STORAGE-KEYS.md)
- [Error Reference](./ERROR-REFERENCE.md)
- [Contract Architecture Overview](../ARCHITECTURE.md)
- [Design Patterns Guide](../PATTERNS.md)