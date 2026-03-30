# Escrow Contract Documentation

## Table of Contents

- [Contract Overview](#contract-overview)
- [Public Functions](#public-functions)
- [Storage Structure](#storage-structure)
- [Events](#events)
- [Error Codes](#error-codes)
- [Fund Management](#fund-management)
- [Release Procedures](#release-procedures)
- [Dispute Handling](#dispute-handling)
- [Usage Examples](#usage-examples)
- [Integration](#integration)

---

## Contract Overview

The **Escrow** contract manages security deposit escrows for the Chioma housing protocol. It implements a **2-of-3 multi-signature** release mechanism with dispute resolution and timeout-based recovery, ensuring secure fund holding between tenants (depositors), landlords (beneficiaries), and platform administrators (arbiters).

### Purpose

- Securely hold security deposits in on-chain escrow accounts
- Implement 2-of-3 multi-sig approval for fund releases
- Provide dispute resolution with arbiter involvement
- Support partial releases and damage deductions
- Enable timeout-based automatic resolution for stale escrows and disputes

### Key Features

| Feature | Description |
|---|---|
| **2-of-3 Multi-Sig** | Any 2 of 3 parties (depositor, beneficiary, arbiter) must approve fund release |
| **Dispute Resolution** | Either primary party can freeze funds; arbiter resolves disputes |
| **Partial Releases** | Release a portion of escrowed funds with reason tracking |
| **Damage Deductions** | Deduct damage amounts before releasing remaining funds |
| **Timeout Recovery** | Automatic refund when escrow or dispute timeout is reached |
| **Rate Limiting** | Per-user and per-block rate limits to prevent abuse |
| **Release History** | Full audit trail of all partial releases |
| **Access Control** | Role-based authorization (depositor, beneficiary, arbiter) |

### Architecture

The contract follows a modular architecture with separation of concerns:

```
escrow/
├── src/
│   ├── lib.rs              # Module declarations and re-exports
│   ├── escrow_impl.rs      # Core contract implementation (public API)
│   ├── access.rs           # Access control and role validation
│   ├── dispute.rs          # Dispute initiation and resolution logic
│   ├── storage.rs          # Storage operations (getters/setters)
│   ├── types.rs            # Data structures and enums
│   ├── errors.rs           # Error codes
│   ├── events.rs           # Event definitions and emission helpers
│   ├── rate_limit.rs       # Rate limiting module
│   ├── tests.rs            # Comprehensive test suite
│   └── tests_rate_limit.rs # Rate limiting tests
```

---

## Public Functions

### Escrow Lifecycle

#### `create`

Create a new escrow for a security deposit. Returns a unique escrow ID (32-byte hash).

```rust
pub fn create(
    env: Env,
    depositor: Address,
    beneficiary: Address,
    arbiter: Address,
    amount: i128,
    token: Address,
) -> Result<BytesN<32>, EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `depositor` | `Address` | Tenant depositing funds |
| `beneficiary` | `Address` | Landlord who benefits from the deposit |
| `arbiter` | `Address` | Admin/arbiter who can resolve disputes |
| `amount` | `i128` | Deposit amount in token units |
| `token` | `Address` | Token contract address (e.g., USDC, XLM) |

**Returns:** `Result<BytesN<32>, EscrowError>` — Unique 32-byte escrow ID

**Errors:**
- `InvalidAmount` (14) — Amount is zero or negative

**Example:**

```rust
let escrow_id = client.create(
    &tenant,
    &landlord,
    &arbiter,
    &10_000_000, // 10 USDC (7 decimals)
    &usdc_token,
);
```

#### `fund_escrow`

Fund a pending escrow by transferring tokens from the depositor to the contract.

```rust
pub fn fund_escrow(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID returned by `create()` |
| `caller` | `Address` | Must be the depositor |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — No escrow with this ID
- `NotAuthorized` (1) — Caller is not the depositor
- `InvalidState` (2) — Escrow is not in `Pending` state

**Authorization:** Requires `caller.require_auth()`

**Example:**

```rust
client.fund_escrow(&escrow_id, &tenant);
```

---

### Release Functions

#### `approve_release`

Approve full release of escrowed funds to a target address. When 2 of 3 parties approve the same target, funds are automatically transferred.

```rust
pub fn approve_release(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    release_to: Address,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |
| `caller` | `Address` | One of the 3 parties |
| `release_to` | `Address` | Must be either depositor or beneficiary |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Funded` state
- `InvalidSigner` (5) — Caller is not a party to this escrow
- `AlreadySigned` (4) — Caller already approved this target
- `InvalidApprovalTarget` (11) — Target is neither depositor nor beneficiary
- `DisputeActive` (6) — Escrow is under dispute

**Authorization:** Requires `caller.require_auth()`

**Example:**

```rust
// Landlord approves release to themselves
client.approve_release(&escrow_id, &landlord, &landlord);

// Arbiter also approves release to landlord (2-of-3 met, funds auto-transfer)
client.approve_release(&escrow_id, &arbiter, &landlord);
```

#### `approve_partial_release`

Approve a partial release of escrowed funds. Similar to `approve_release` but does not auto-execute on 2-of-3.

```rust
pub fn approve_partial_release(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    release_to: Address,
) -> Result<(), EscrowError>
```

**Parameters:** Same as `approve_release`

**Returns:** `Result<(), EscrowError>`

**Authorization:** Requires `caller.require_auth()`

#### `release_escrow_partial`

Execute a partial release after 2-of-3 approval. Transfers a specified amount and records the release.

```rust
pub fn release_escrow_partial(
    env: Env,
    escrow_id: BytesN<32>,
    amount: i128,
    recipient: Address,
    reason: String,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |
| `amount` | `i128` | Amount to release |
| `recipient` | `Address` | Must be depositor or beneficiary |
| `reason` | `String` | Reason for partial release |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Funded` state
- `InvalidAmount` (14) — Amount exceeds balance or is zero/negative
- `InvalidApprovalTarget` (11) — Recipient is neither depositor nor beneficiary
- `EmptyReleaseReason` (15) — Reason string is empty
- `NotAuthorized` (1) — Insufficient approvals (< 2)

**Example:**

```rust
// After 2-of-3 approval for partial release
client.release_escrow_partial(
    &escrow_id,
    &5_000_000, // Release 5 USDC
    &landlord,
    &String::from_str(&env, "Early move-out partial refund"),
);
```

#### `release_with_deduction`

Release funds with a damage deduction. Sends damage amount to beneficiary (landlord) and remaining balance to depositor (tenant).

```rust
pub fn release_with_deduction(
    env: Env,
    escrow_id: BytesN<32>,
    damage_amount: i128,
    reason: String,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |
| `damage_amount` | `i128` | Amount to deduct for damages |
| `reason` | `String` | Reason for the deduction |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Funded` state
- `InvalidAmount` (14) — Damage amount exceeds balance or is negative
- `EmptyReleaseReason` (15) — Reason string is empty
- `NotAuthorized` (1) — Insufficient approvals (< 2)

**Example:**

```rust
// Deduct 2 USDC for damages, refund remaining to tenant
client.release_with_deduction(
    &escrow_id,
    &2_000_000,
    &String::from_str(&env, "Wall damage repair"),
);
```

---

### Dispute Functions

#### `initiate_dispute`

Freeze escrow funds and initiate a dispute. Only depositor or beneficiary can initiate.

```rust
pub fn initiate_dispute(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    reason: String,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |
| `caller` | `Address` | Must be depositor or beneficiary |
| `reason` | `String` | Reason for the dispute |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Funded` state
- `NotAuthorized` (1) — Caller is not depositor or beneficiary
- `EmptyDisputeReason` (10) — Reason string is empty

**Authorization:** Requires `caller.require_auth()`

**Example:**

```rust
client.initiate_dispute(
    &escrow_id,
    &tenant,
    &String::from_str(&env, "Property not as described"),
);
```

#### `resolve_dispute`

Resolve a dispute and release funds to the specified party. Only the arbiter can resolve disputes.

```rust
pub fn resolve_dispute(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    release_to: Address,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |
| `caller` | `Address` | Must be the arbiter |
| `release_to` | `Address` | Must be depositor or beneficiary |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Disputed` state
- `NotAuthorized` (1) — Caller is not the arbiter
- `InvalidApprovalTarget` (11) — Target is neither depositor nor beneficiary

**Authorization:** Requires `caller.require_auth()`

**Example:**

```rust
// Arbiter resolves dispute in favor of tenant (refund)
client.resolve_dispute(&escrow_id, &arbiter, &tenant);
```

---

### Timeout Functions

#### `release_escrow_on_timeout`

Automatically refund escrowed funds to the depositor when the escrow timeout period has elapsed.

```rust
pub fn release_escrow_on_timeout(
    env: Env,
    escrow_id: BytesN<32>,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Funded` state
- `TimeoutNotReached` (12) — Timeout deadline has not passed

**Example:**

```rust
// After timeout period has elapsed
client.release_escrow_on_timeout(&escrow_id);
```

#### `resolve_dispute_on_timeout`

Automatically refund escrowed funds to the depositor when the dispute timeout period has elapsed without resolution.

```rust
pub fn resolve_dispute_on_timeout(
    env: Env,
    escrow_id: BytesN<32>,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `escrow_id` | `BytesN<32>` | Escrow ID |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — Escrow does not exist
- `InvalidState` (2) — Escrow not in `Disputed` state
- `TimeoutNotReached` (12) — Dispute timeout has not passed

---

### Configuration Functions

#### `set_timeout_config`

Configure the timeout durations for escrows, disputes, and payments. Only callable by the arbiter of an existing escrow.

```rust
pub fn set_timeout_config(
    env: Env,
    caller: Address,
    config: TimeoutConfig,
) -> Result<(), EscrowError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `caller` | `Address` | Caller address (requires auth) |
| `config` | `TimeoutConfig` | Timeout configuration |

**Returns:** `Result<(), EscrowError>`

**Errors:**
- `InvalidTimeoutConfig` (13) — Timeout values are zero

**Example:**

```rust
let config = TimeoutConfig {
    escrow_timeout_days: 14,
    dispute_timeout_days: 30,
    payment_timeout_days: 7,
};
client.set_timeout_config(&admin, &config);
```

#### `get_timeout_config`

Retrieve the current timeout configuration.

```rust
pub fn get_timeout_config(env: Env) -> TimeoutConfig
```

**Returns:** `TimeoutConfig` — Current timeout settings (defaults if not configured)

**Default Values:**

| Setting | Default | Description |
|---|---|---|
| `escrow_timeout_days` | 14 | Days before escrow can be auto-refunded |
| `dispute_timeout_days` | 30 | Days before dispute auto-resolves |
| `payment_timeout_days` | 7 | Days for payment timeout |

---

### Query Functions

#### `get_escrow`

Retrieve full details of an escrow.

```rust
pub fn get_escrow(
    env: Env,
    escrow_id: BytesN<32>,
) -> Result<Escrow, EscrowError>
```

**Returns:** `Result<Escrow, EscrowError>`

**Errors:**
- `EscrowNotFound` (9) — No escrow with this ID

#### `get_approval_count`

Get the number of approvals for a specific release target.

```rust
pub fn get_approval_count(
    env: Env,
    escrow_id: BytesN<32>,
    release_to: Address,
) -> Result<u32, EscrowError>
```

**Returns:** `Result<u32, EscrowError>` — Number of approvals (0, 1, or 2)

#### `get_release_history`

Get the full release history for an escrow (all partial releases).

```rust
pub fn get_release_history(
    env: Env,
    escrow_id: BytesN<32>,
) -> Result<Vec<ReleaseRecord>, EscrowError>
```

**Returns:** `Result<Vec<ReleaseRecord>, EscrowError>`

---

## Storage Structure

### Storage Keys

```rust
#[contracttype]
pub enum DataKey {
    /// Main escrow data: DataKey::Escrow(escrow_id) => Escrow
    Escrow(BytesN<32>),
    /// Release approval list: DataKey::Approvals(escrow_id) => Vec<ReleaseApproval>
    Approvals(BytesN<32>),
    /// Dispute info: DataKey::DisputeInfo(escrow_id)
    DisputeInfo(BytesN<32>),
    /// Total escrow counter (instance storage)
    EscrowCount,
    /// Per-target approval count (O(1)): DataKey::ApprovalCount(escrow_id, release_to) => u32
    ApprovalCount(BytesN<32>, Address),
    /// Per-signer approval flag (O(1)): DataKey::SignerApproved(escrow_id, signer, release_to) => bool
    SignerApproved(BytesN<32>, Address, Address),
    /// Contract-level timeout configuration (instance storage)
    TimeoutConfig,
    /// Partial release history: DataKey::ReleaseHistory(escrow_id) => Vec<ReleaseRecord>
    ReleaseHistory(BytesN<32>),
    /// Rate limiting configuration (persistent storage)
    RateLimitConfig,
    /// Per-user call tracking: DataKey::UserCallCount(user, function_name) => UserCallCount
    UserCallCount(Address, String),
    /// Per-block call tracking: DataKey::BlockCallCount(block, function_name) => u32
    BlockCallCount(u64, String),
}
```

### Storage Layout

| Key | Storage Type | Value Type | Description |
|---|---|---|---|
| `Escrow(id)` | Persistent | `Escrow` | Main escrow data |
| `Approvals(id)` | Persistent | `Vec<ReleaseApproval>` | List of release approvals |
| `ApprovalCount(id, target)` | Persistent | `u32` | O(1) approval count per target |
| `SignerApproved(id, signer, target)` | Persistent | `bool` | O(1) duplicate check |
| `ReleaseHistory(id)` | Persistent | `Vec<ReleaseRecord>` | Partial release audit trail |
| `EscrowCount` | Instance | `u32` | Total escrows created |
| `TimeoutConfig` | Instance | `TimeoutConfig` | Timeout settings |
| `RateLimitConfig` | Persistent | `RateLimitConfig` | Rate limit settings |
| `UserCallCount(user, fn)` | Persistent | `UserCallCount` | Per-user rate tracking |
| `BlockCallCount(block, fn)` | Temporary | `u32` | Per-block rate tracking |

### Data Structures

#### `Escrow`

```rust
#[contracttype]
pub struct Escrow {
    pub id: BytesN<32>,              // Unique escrow identifier
    pub depositor: Address,          // Tenant depositing funds
    pub beneficiary: Address,        // Landlord benefiting from deposit
    pub arbiter: Address,            // Admin/arbiter for disputes
    pub amount: i128,                // Escrowed amount
    pub token: Address,              // Token contract address
    pub status: EscrowStatus,        // Current lifecycle status
    pub created_at: u64,             // Creation timestamp
    pub timeout_days: u64,           // Timeout threshold in days
    pub disputed_at: Option<u64>,    // Dispute initiation timestamp
    pub dispute_reason: Option<String>, // Dispute reason
}
```

#### `EscrowStatus`

```rust
#[contracttype]
pub enum EscrowStatus {
    Pending = 0,   // Created, not yet funded
    Funded = 1,    // Funds deposited
    Released = 2,  // Funds released to beneficiary
    Refunded = 3,  // Funds refunded to depositor
    Disputed = 4,  // Under dispute, funds frozen
}
```

#### `ReleaseApproval`

```rust
#[contracttype]
pub struct ReleaseApproval {
    pub signer: Address,       // Party approving release
    pub release_to: Address,   // Target for funds
    pub timestamp: u64,        // Approval timestamp
}
```

#### `ReleaseRecord`

```rust
#[contracttype]
pub struct ReleaseRecord {
    pub escrow_id: BytesN<32>,  // Escrow identifier
    pub amount: i128,           // Amount released
    pub recipient: Address,     // Recipient of funds
    pub released_at: u64,       // Release timestamp
    pub reason: String,         // Reason for release
}
```

#### `TimeoutConfig`

```rust
#[contracttype]
pub struct TimeoutConfig {
    pub escrow_timeout_days: u64,   // Default: 14 days
    pub dispute_timeout_days: u64,  // Default: 30 days
    pub payment_timeout_days: u64,  // Default: 7 days
}
```

---

## Events

### `EscrowTimeout`

Emitted when an escrow is auto-refunded due to timeout.

```rust
#[contractevent(topics = ["escrow_timeout"])]
pub struct EscrowTimeout {
    pub escrow_id: BytesN<32>,
}
```

**When:** Called during `release_escrow_on_timeout()`

### `DisputeTimeout`

Emitted when a dispute is auto-resolved due to timeout.

```rust
#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    pub escrow_id: BytesN<32>,
}
```

**When:** Called during `resolve_dispute_on_timeout()`

### `PartialRelease`

Emitted when a partial release of funds occurs.

```rust
#[contractevent(topics = ["partial_release"])]
pub struct PartialRelease {
    pub escrow_id: BytesN<32>,
    pub amount: i128,
    pub recipient: Address,
}
```

**When:** Called during `release_escrow_partial()`

### `DamageDeduction`

Emitted when a damage deduction release occurs.

```rust
#[contractevent(topics = ["damage_deduction"])]
pub struct DamageDeduction {
    pub escrow_id: BytesN<32>,
    pub damage_amount: i128,
    pub refund_amount: i128,
}
```

**When:** Called during `release_with_deduction()`

### Listening for Events

```typescript
// Off-chain event listener example (JavaScript/Stellar SDK)
const events = await server.getEvents({
  startLedger: ledgerNumber,
  filters: [{
    type: "contract",
    contractIds: [escrowContractId],
    topics: [["escrow_timeout", "dispute_timeout", "partial_release", "damage_deduction"]]
  }]
});

for (const event of events.events) {
  console.log("Escrow event:", event.topic, event.value);
}
```

---

## Error Codes

| Code | Name | Description |
|---|---|---|
| 1 | `NotAuthorized` | Caller is not authorized for this action |
| 2 | `InvalidState` | Escrow is in an invalid state for this operation |
| 3 | `InsufficientFunds` | Insufficient funds for the operation |
| 4 | `AlreadySigned` | Signer has already approved this release |
| 5 | `InvalidSigner` | Signer is not a valid party to this escrow |
| 6 | `DisputeActive` | Escrow is under active dispute |
| 7 | `InvalidRelease` | Invalid release target address |
| 8 | `InvalidEscrowId` | Invalid escrow ID |
| 9 | `EscrowNotFound` | Escrow does not exist |
| 10 | `EmptyDisputeReason` | Dispute reason string is empty |
| 11 | `InvalidApprovalTarget` | Target is neither beneficiary nor depositor |
| 12 | `TimeoutNotReached` | Timeout deadline has not been reached |
| 13 | `InvalidTimeoutConfig` | Timeout configuration values are invalid |
| 14 | `InvalidAmount` | Release amount is invalid (zero, negative, exceeds balance) |
| 15 | `EmptyReleaseReason` | Release reason string is empty |
| 16 | `RateLimitExceeded` | Rate limit exceeded for this operation |
| 17 | `CooldownNotMet` | Cooldown period between calls not met |

---

## Fund Management

### Escrow Lifecycle

```
┌───────────┐    fund_escrow    ┌───────────┐   approve_release   ┌───────────┐
│  Pending   │────────────────▶│  Funded    │────(2-of-3)────────▶│ Released   │
│ (Created)  │                  │            │                     │            │
└───────────┘                  └─────┬──────┘                     └───────────┘
                                     │
                          ┌──────────┼──────────┐
                          │          │          │
                  initiate_dispute   │   timeout_release
                          │          │          │
                          ▼          │          ▼
                   ┌───────────┐     │   ┌───────────┐
                   │ Disputed   │     │   │ Refunded   │
                   │ (Frozen)   │     │   │            │
                   └─────┬─────┘     │   └───────────┘
                         │           │
              ┌──────────┼──────────┐
              │                     │
       resolve_dispute     dispute_timeout
              │                     │
              ▼                     ▼
       ┌───────────┐         ┌───────────┐
       │ Released   │         │ Refunded   │
       └───────────┘         └───────────┘
```

### Fund Flow

1. **Creation:** Escrow is created in `Pending` state with details of all three parties
2. **Funding:** Depositor transfers tokens to the contract, escrow moves to `Funded`
3. **Release:** With 2-of-3 approval, funds transfer to approved target
4. **Dispute:** Funds are frozen; arbiter decides fund disposition
5. **Timeout:** Automatic refund to depositor if no action taken within timeout

### Security Model

The contract follows the **Checks-Effects-Interactions (CEI)** pattern:

1. **Checks:** Validate all inputs, authorization, and state
2. **Effects:** Update contract storage state
3. **Interactions:** Perform token transfers last

This prevents reentrancy attacks by ensuring state is updated before any external calls.

---

## Release Procedures

### Full Release (2-of-3 Multi-Sig)

```rust
// Step 1: Landlord (beneficiary) approves release to themselves
client.approve_release(&escrow_id, &landlord, &landlord);

// Step 2: Tenant (depositor) also approves release to landlord
// This triggers automatic transfer (2-of-3 met)
client.approve_release(&escrow_id, &tenant, &landlord);
// Funds are now transferred to landlord
```

### Partial Release

```rust
// Step 1: Get approvals for partial release
client.approve_partial_release(&escrow_id, &landlord, &tenant);
client.approve_partial_release(&escrow_id, &arbiter, &tenant);

// Step 2: Execute partial release with amount and reason
client.release_escrow_partial(
    &escrow_id,
    &3_000_000,  // 3 USDC
    &tenant,
    &String::from_str(&env, "Early lease termination partial refund"),
);

// Step 3: Check remaining balance
let escrow = client.get_escrow(&escrow_id);
assert_eq!(escrow.amount, 7_000_000); // 7 USDC remaining
```

### Damage Deduction Release

```rust
// After 2-of-3 approval for release to beneficiary
client.approve_release(&escrow_id, &landlord, &landlord);
client.approve_release(&escrow_id, &arbiter, &landlord);

// Release with damage deduction
// Landlord gets damage_amount, tenant gets the rest
client.release_with_deduction(
    &escrow_id,
    &2_000_000,  // 2 USDC damages to landlord
    &String::from_str(&env, "Kitchen appliance damage"),
);
// Landlord receives 2 USDC (damages)
// Tenant receives 8 USDC (refund of remaining)
```

### Timeout Release

```rust
// If escrow timeout has passed (default: 14 days after creation)
// Anyone can trigger automatic refund to depositor
client.release_escrow_on_timeout(&escrow_id);
// All funds returned to tenant (depositor)
```

---

## Dispute Handling

### Dispute Flow

```
1. Tenant or Landlord initiates dispute
   └── Escrow status → Disputed
   └── All existing approvals cleared (funds frozen)

2. Arbiter reviews dispute
   └── Off-chain investigation and evidence gathering

3. Arbiter resolves dispute
   └── Funds released to winning party
   └── Escrow status → Released

OR

3. Dispute times out (default: 30 days)
   └── Funds automatically refunded to depositor
   └── Escrow status → Refunded
```

### Dispute Example

```rust
// Tenant disputes the escrow
client.initiate_dispute(
    &escrow_id,
    &tenant,
    &String::from_str(&env, "Property condition does not match listing"),
);

// Verify dispute state
let escrow = client.get_escrow(&escrow_id);
assert_eq!(escrow.status, EscrowStatus::Disputed);
assert!(escrow.dispute_reason.is_some());

// Arbiter resolves in favor of tenant (refund)
client.resolve_dispute(&escrow_id, &arbiter, &tenant);

// OR: Arbiter resolves in favor of landlord (release)
client.resolve_dispute(&escrow_id, &arbiter, &landlord);
```

### Dispute Timeout

```rust
// If 30 days pass without resolution
client.resolve_dispute_on_timeout(&escrow_id);
// Funds automatically refunded to depositor (tenant)
```

---

## Usage Examples

### Complete Escrow Lifecycle

```rust
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String};

// Setup
let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(EscrowContract, ());
let client = EscrowContractClient::new(&env, &contract_id);

let tenant = Address::generate(&env);
let landlord = Address::generate(&env);
let arbiter = Address::generate(&env);
let token = Address::generate(&env); // Token contract address

// 1. Create escrow
let escrow_id = client.create(
    &tenant,
    &landlord,
    &arbiter,
    &10_000_000, // 10 USDC
    &token,
);

// 2. Fund the escrow
client.fund_escrow(&escrow_id, &tenant);

// 3. Verify escrow state
let escrow = client.get_escrow(&escrow_id);
assert_eq!(escrow.status, EscrowStatus::Funded);
assert_eq!(escrow.amount, 10_000_000);

// 4. Approve release (landlord + arbiter agree)
client.approve_release(&escrow_id, &landlord, &landlord);
client.approve_release(&escrow_id, &arbiter, &landlord);
// Funds auto-transferred to landlord

// 5. Verify final state
let final_escrow = client.get_escrow(&escrow_id);
assert_eq!(final_escrow.status, EscrowStatus::Released);
```

### Multiple Partial Releases

```rust
// Create and fund escrow for 10 USDC
let escrow_id = client.create(&tenant, &landlord, &arbiter, &10_000_000, &token);
client.fund_escrow(&escrow_id, &tenant);

// First partial release: 3 USDC to tenant
client.approve_partial_release(&escrow_id, &landlord, &tenant);
client.approve_partial_release(&escrow_id, &arbiter, &tenant);
client.release_escrow_partial(
    &escrow_id,
    &3_000_000,
    &tenant,
    &String::from_str(&env, "Overpayment refund"),
);

// Second partial release: 2 USDC to landlord
client.approve_partial_release(&escrow_id, &tenant, &landlord);
client.approve_partial_release(&escrow_id, &arbiter, &landlord);
client.release_escrow_partial(
    &escrow_id,
    &2_000_000,
    &landlord,
    &String::from_str(&env, "Utility charges"),
);

// Check release history
let history = client.get_release_history(&escrow_id);
assert_eq!(history.len(), 2);
```

### Error Handling

```rust
// Attempting to fund an already funded escrow
match client.try_fund_escrow(&escrow_id, &tenant) {
    Ok(Ok(())) => { /* Success */ }
    Ok(Err(EscrowError::InvalidState)) => {
        // Escrow already funded
    }
    Ok(Err(EscrowError::NotAuthorized)) => {
        // Caller is not the depositor
    }
    Err(e) => {
        // Invocation error
    }
    _ => {}
}
```

---

## Integration

### Integration with Property Registry

```rust
// Verify property before creating escrow
fn create_property_escrow(
    env: &Env,
    property_registry: &Address,
    property_id: &String,
    escrow_contract: &Address,
    tenant: &Address,
    landlord: &Address,
    arbiter: &Address,
    deposit_amount: i128,
    token: &Address,
) -> Result<BytesN<32>, Error> {
    // Verify property is registered and verified
    let registry_client = PropertyRegistryContractClient::new(env, property_registry);
    let property = registry_client
        .get_property(property_id)
        .ok_or(Error::PropertyNotFound)?;

    if !property.verified {
        return Err(Error::PropertyNotVerified);
    }

    // Create escrow for verified property
    let escrow_client = EscrowContractClient::new(env, escrow_contract);
    let escrow_id = escrow_client.create(tenant, landlord, arbiter, &deposit_amount, token)?;

    Ok(escrow_id)
}
```

### Integration with Payment Contract

```rust
// Use escrow for security deposit alongside recurring rent payments
fn setup_rental(
    env: &Env,
    escrow_contract: &Address,
    payment_contract: &Address,
    tenant: &Address,
    landlord: &Address,
    arbiter: &Address,
    deposit_amount: i128,
    monthly_rent: i128,
    token: &Address,
    agreement_id: &String,
) -> Result<(), Error> {
    // 1. Create and fund escrow for security deposit
    let escrow_client = EscrowContractClient::new(env, escrow_contract);
    let escrow_id = escrow_client.create(tenant, landlord, arbiter, &deposit_amount, token)?;
    escrow_client.fund_escrow(&escrow_id, tenant)?;

    // 2. Set up recurring payments for rent
    let payment_client = PaymentContractClient::new(env, payment_contract);
    payment_client.create_recurring_payment(
        agreement_id,
        &monthly_rent,
        &PaymentFrequency::Monthly,
        &env.ledger().timestamp(),
        &(env.ledger().timestamp() + 31_536_000), // 1 year
        &true, // auto-renew
    )?;

    Ok(())
}
```

### Integration with Dispute Resolution Contract

```rust
// Escalate escrow dispute to the Dispute Resolution contract
fn escalate_escrow_dispute(
    env: &Env,
    escrow_contract: &Address,
    dispute_contract: &Address,
    escrow_id: &BytesN<32>,
    caller: &Address,
    reason: &String,
) -> Result<(), Error> {
    // 1. Initiate dispute on escrow (freezes funds)
    let escrow_client = EscrowContractClient::new(env, escrow_contract);
    escrow_client.initiate_dispute(escrow_id, caller, reason)?;

    // 2. Raise formal dispute in Dispute Resolution contract
    let dispute_client = DisputeResolutionContractClient::new(env, dispute_contract);
    dispute_client.raise_dispute(caller, reason)?;

    Ok(())
}
```

### Integration Checklist

- [ ] Create escrow with correct depositor, beneficiary, and arbiter addresses
- [ ] Fund escrow before attempting any release operations
- [ ] Collect 2-of-3 approvals before executing releases
- [ ] Handle all `EscrowError` variants in cross-contract calls
- [ ] Configure appropriate timeout values for your use case
- [ ] Listen for escrow events for off-chain state tracking
- [ ] Integrate with Dispute Resolution contract for formal dispute handling

---

## Related Documentation

- [Contract Architecture Overview](../architecture/DESIGN-PATTERNS.md) — Design patterns used across contracts
- [Property Registry Contract](./PROPERTY-REGISTRY.md) — Property registration and verification
- [Payment Contract](./PAYMENT.md) — Payment processing and recurring payments
- [Dispute Resolution Contract](../../contracts/dispute_resolution/README.md) — Formal dispute resolution
- [Emergency Procedures](../security/EMERGENCY-PROCEDURES.md) — Emergency pause and recovery
- [Stellar Integration Guide](../integration/STELLAR-INTEGRATION.md) — Stellar SDK integration
