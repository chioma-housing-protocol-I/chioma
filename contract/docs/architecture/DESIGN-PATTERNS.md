# Design Patterns Guide

## Table of Contents

- [Storage Patterns](#storage-patterns)
- [Event Patterns](#event-patterns)
- [Authorization Patterns](#authorization-patterns)
- [Error Handling Patterns](#error-handling-patterns)
- [State Management Patterns](#state-management-patterns)
- [Initialization Patterns](#initialization-patterns)
- [Upgrade Patterns](#upgrade-patterns)
- [Anti-Patterns](#anti-patterns)
- [Performance Patterns](#performance-patterns)
- [Testing Patterns](#testing-patterns)

---

## Storage Patterns

Soroban provides three storage tiers, each with different characteristics and costs. Choosing the correct tier is critical for gas efficiency and data persistence.

### Storage Tiers

| Tier | Method | Persistence | Cost | Use Case |
|---|---|---|---|---|
| **Instance** | `env.storage().instance()` | Contract lifetime | Lowest | Config, counters, admin |
| **Persistent** | `env.storage().persistent()` | Requires TTL extension | Medium | Agreements, user data |
| **Temporary** | `env.storage().temporary()` | Auto-expires | Lowest | Rate limits, caches |

### Enum-Based Key Pattern

Use a `DataKey` enum for type-safe, organized storage keys:

```rust
use soroban_sdk::{contracttype, Address, BytesN, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    // Instance storage keys (contract-level config)
    State,
    Initialized,
    EscrowCount,
    TimeoutConfig,

    // Persistent storage keys (entity data)
    Escrow(BytesN<32>),
    Agreement(String),
    Property(String),

    // Composite keys for efficient lookups
    ApprovalCount(BytesN<32>, Address),
    SignerApproved(BytesN<32>, Address, Address),

    // Temporary storage keys (ephemeral data)
    BlockCallCount(u64, String),
}
```

**Why this works:**
- Compile-time type safety — no string key typos
- Self-documenting — key purpose is clear from the enum variant
- Composite keys enable O(1) lookups without iterating lists

### Instance Storage Pattern

Use instance storage for contract-level state that rarely changes:

```rust
// Good: Admin address, config, counters
pub fn get_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get::<_, u32>(&DataKey::EscrowCount)
        .unwrap_or_default()
}

pub fn increment_count(env: &Env) {
    let count = Self::get_count(env);
    env.storage()
        .instance()
        .set(&DataKey::EscrowCount, &(count + 1));
}
```

### Persistent Storage Pattern

Use persistent storage for entity data with explicit TTL management:

```rust
// Good: Entity data with save/load helpers
pub fn get(env: &Env, id: &BytesN<32>) -> Option<Escrow> {
    let key = DataKey::Escrow(id.clone());
    env.storage().persistent().get::<_, Escrow>(&key)
}

pub fn save(env: &Env, escrow: &Escrow) {
    let key = DataKey::Escrow(escrow.id.clone());
    env.storage().persistent().set(&key, escrow);
}

// Extend TTL for important data
pub fn extend_ttl(env: &Env, key: &DataKey) {
    env.storage().persistent().extend_ttl(key, 500_000, 500_000);
}
```

### Temporary Storage Pattern

Use temporary storage for data that expires naturally:

```rust
// Good: Per-block rate limiting counters
let block_key = DataKey::BlockCallCount(current_block, function_name);
let block_calls: u32 = env.storage().temporary().get(&block_key).unwrap_or(0);

env.storage().temporary().set(&block_key, &(block_calls + 1));
env.storage().temporary().extend_ttl(
    &block_key,
    BLOCKS_PER_DAY as u32,
    BLOCKS_PER_DAY as u32,
);
```

### O(1) Lookup Pattern

For data that needs frequent lookups (e.g., approval tracking), use composite keys instead of iterating lists:

```rust
// Good: O(1) composite key lookup
#[contracttype]
pub enum DataKey {
    // Direct lookup: has signer X approved target Y for escrow Z?
    SignerApproved(BytesN<32>, Address, Address),
    // Direct count: how many approvals for target Y on escrow Z?
    ApprovalCount(BytesN<32>, Address),
}

pub fn has_signer_approved(
    env: &Env,
    escrow_id: &BytesN<32>,
    signer: &Address,
    release_to: &Address,
) -> bool {
    let key = DataKey::SignerApproved(
        escrow_id.clone(),
        signer.clone(),
        release_to.clone(),
    );
    env.storage().persistent().get::<_, bool>(&key).unwrap_or(false)
}
```

```rust
// Bad: Iterating a list for lookups (O(n))
pub fn has_signer_approved_bad(
    env: &Env,
    escrow_id: &BytesN<32>,
    signer: &Address,
) -> bool {
    let approvals = Self::get_approvals(env, escrow_id);
    for i in 0..approvals.len() {
        if approvals.get(i).unwrap().signer == *signer {
            return true;
        }
    }
    false
}
```

---

## Event Patterns

Events enable off-chain indexing and monitoring. Soroban events use a topics + data model.

### Contract Event Pattern

Define events using the `#[contractevent]` macro with topic annotations:

```rust
use soroban_sdk::{contractevent, Address, BytesN, Env, String};

// Define the event struct with topics for indexing
#[contractevent(topics = ["property_registered"])]
pub struct PropertyRegistered {
    #[topic]
    pub landlord: Address,   // Searchable: filter by landlord
    pub property_id: String, // Data payload
}

#[contractevent(topics = ["escrow_timeout"])]
pub struct EscrowTimeout {
    #[topic]
    pub escrow_id: BytesN<32>, // Searchable: filter by escrow
}

#[contractevent(topics = ["partial_release"])]
pub struct PartialRelease {
    #[topic]
    pub escrow_id: BytesN<32>, // Searchable
    pub amount: i128,           // Data
    pub recipient: Address,     // Data
}
```

### Event Emission Helper Pattern

Encapsulate event emission in helper functions for consistent usage:

```rust
// Good: Helper function pattern — consistent emission
pub(crate) fn property_registered(env: &Env, landlord: Address, property_id: String) {
    PropertyRegistered {
        landlord,
        property_id,
    }
    .publish(env);
}

pub(crate) fn partial_release(
    env: &Env,
    escrow_id: BytesN<32>,
    amount: i128,
    recipient: Address,
) {
    PartialRelease {
        escrow_id,
        amount,
        recipient,
    }
    .publish(env);
}
```

```rust
// Usage in contract logic
fn register_property(env: Env, landlord: Address, property_id: String) {
    // ... registration logic ...
    events::property_registered(&env, landlord, property_id);
}
```

### Topic Selection Guidelines

| Field Type | Use `#[topic]`? | Reason |
|---|---|---|
| User addresses | Yes | Filter events by user |
| Entity IDs | Yes | Filter events by entity |
| Amounts | No | Rarely used for filtering |
| Timestamps | No | Use ledger-based filtering |
| Reason strings | No | Not suitable for filtering |

### Raw Event Pattern

For simple events without custom structs:

```rust
// Alternative: Raw event emission
env.events().publish(
    (String::from_str(&env, "rent_paid"), agreement_id),
    (amount, landlord_amount, agent_amount, timestamp),
);
```

---

## Authorization Patterns

Soroban requires explicit authorization for operations that affect user state.

### Basic Auth Pattern

Use `require_auth()` to verify the caller signed the transaction:

```rust
// Good: Require auth before any state changes
pub fn register_property(
    env: Env,
    landlord: Address,
    property_id: String,
    metadata_hash: String,
) -> Result<(), PropertyError> {
    // Authorization first
    landlord.require_auth();

    // Then proceed with logic
    // ...
    Ok(())
}
```

### Admin-Only Pattern

Store the admin address during initialization and validate against it:

```rust
// Initialization: store admin
pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
    if env.storage().instance().has(&DataKey::Initialized) {
        return Err(Error::AlreadyInitialized);
    }

    let state = ContractState { admin: admin.clone() };
    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().set(&DataKey::Initialized, &true);
    Ok(())
}

// Admin check: validate caller is admin
pub fn verify_property(
    env: Env,
    admin: Address,
    property_id: String,
) -> Result<(), Error> {
    // Load contract state
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(Error::NotInitialized)?;

    // Verify caller is admin
    if admin != state.admin {
        return Err(Error::Unauthorized);
    }

    // Require auth signature
    admin.require_auth();

    // Proceed...
    Ok(())
}
```

### Role-Based Access Control Pattern

Encapsulate role checks in a dedicated `AccessControl` module:

```rust
pub struct AccessControl;

impl AccessControl {
    /// Verify caller is the depositor (tenant)
    pub fn is_depositor(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }

    /// Verify caller is the beneficiary (landlord)
    pub fn is_beneficiary(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.beneficiary == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }

    /// Verify caller is any of the three parties
    pub fn is_party(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller
            || escrow.beneficiary == *caller
            || escrow.arbiter == *caller
        {
            Ok(())
        } else {
            Err(EscrowError::InvalidSigner)
        }
    }

    /// Verify caller is a primary party (for dispute initiation)
    pub fn is_primary_party(escrow: &Escrow, caller: &Address) -> Result<(), EscrowError> {
        if escrow.depositor == *caller || escrow.beneficiary == *caller {
            Ok(())
        } else {
            Err(EscrowError::NotAuthorized)
        }
    }
}
```

**Usage:**

```rust
pub fn initiate_dispute(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    reason: String,
) -> Result<(), EscrowError> {
    let escrow = EscrowStorage::get(&env, &escrow_id)
        .ok_or(EscrowError::EscrowNotFound)?;

    // Role check — only depositor or beneficiary
    AccessControl::is_primary_party(&escrow, &caller)?;

    // Auth signature
    caller.require_auth();

    // Proceed...
    Ok(())
}
```

### Multi-Signature Pattern (2-of-3)

Implement multi-sig approval with O(1) tracking:

```rust
pub fn approve_release(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
    release_to: Address,
) -> Result<(), EscrowError> {
    let escrow = EscrowStorage::get(&env, &escrow_id)
        .ok_or(EscrowError::EscrowNotFound)?;

    // Verify caller is a party
    AccessControl::is_party(&escrow, &caller)?;

    // Verify target is valid (depositor or beneficiary)
    if release_to != escrow.beneficiary && release_to != escrow.depositor {
        return Err(EscrowError::InvalidApprovalTarget);
    }

    // Check for duplicate approval (O(1))
    if EscrowStorage::has_signer_approved(&env, &escrow_id, &caller, &release_to) {
        return Err(EscrowError::AlreadySigned);
    }

    caller.require_auth();

    // Record approval
    EscrowStorage::set_signer_approved(&env, &escrow_id, &caller, &release_to);
    EscrowStorage::increment_approval_count(&env, &escrow_id, &release_to);

    // Check if 2-of-3 threshold met
    let count = EscrowStorage::get_approval_count_for_target(&env, &escrow_id, &release_to);
    if count >= 2 {
        // Auto-execute release
        // ...
    }

    Ok(())
}
```

---

## Error Handling Patterns

### Contract Error Enum Pattern

Define errors using `#[contracterror]` with unique numeric codes:

```rust
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowError {
    // Authorization errors (1-5)
    NotAuthorized = 1,
    InvalidState = 2,
    InsufficientFunds = 3,
    AlreadySigned = 4,
    InvalidSigner = 5,

    // Dispute errors (6-10)
    DisputeActive = 6,
    InvalidRelease = 7,
    InvalidEscrowId = 8,
    EscrowNotFound = 9,
    EmptyDisputeReason = 10,

    // Validation errors (11-15)
    InvalidApprovalTarget = 11,
    TimeoutNotReached = 12,
    InvalidTimeoutConfig = 13,
    InvalidAmount = 14,
    EmptyReleaseReason = 15,

    // Rate limiting errors (16-17)
    RateLimitExceeded = 16,
    CooldownNotMet = 17,
}
```

**Best practices:**
- Group errors by category using code ranges
- Use unique codes across the entire contract
- Derive `Copy, Clone, Debug, Eq, PartialEq` for testing
- Use `#[repr(u32)]` for predictable error codes

### Error Message Pattern

Add human-readable messages for error context:

```rust
impl RentalError {
    pub fn message(&self, env: &Env) -> String {
        let msg = match self {
            RentalError::AlreadyInitialized => "Contract already initialized.",
            RentalError::AgreementNotFound => "Agreement not found.",
            RentalError::Unauthorized => "Unauthorized access.",
            // ... more messages
        };
        String::from_str(env, msg)
    }

    pub fn code(&self) -> u32 {
        *self as u32
    }
}
```

### Error Logging Pattern

Log errors for debugging and monitoring:

```rust
#[contracttype]
pub struct ErrorContext {
    pub error_code: u32,
    pub error_message: String,
    pub details: String,
    pub timestamp: u64,
    pub operation: String,
}

pub fn log_error(
    env: &Env,
    error: RentalError,
    operation: String,
    details: String,
) -> Result<(), RentalError> {
    let context = ErrorContext {
        error_code: error.code(),
        error_message: error.message(env),
        details,
        timestamp: env.ledger().timestamp(),
        operation: operation.clone(),
    };

    // Store error log
    let count = get_error_count(env);
    env.storage().persistent().set(&DataKey::ErrorLog(count), &context);
    increment_error_count(env);

    // Emit error event
    events::error_occurred(env, context.error_code, operation, context.timestamp);

    Ok(())
}
```

### Result Propagation Pattern

Use the `?` operator for clean error propagation:

```rust
// Good: Clean error propagation with ?
pub fn verify_property(
    env: Env,
    admin: Address,
    property_id: String,
) -> Result<(), PropertyError> {
    let state = get_state(&env).ok_or(PropertyError::NotInitialized)?;

    if admin != state.admin {
        return Err(PropertyError::Unauthorized);
    }

    let mut property = get_property(&env, &property_id)
        .ok_or(PropertyError::PropertyNotFound)?;

    if property.verified {
        return Err(PropertyError::AlreadyVerified);
    }

    admin.require_auth();

    property.verified = true;
    property.verified_at = env.ledger().timestamp();
    save_property(&env, &property);

    Ok(())
}
```

---

## State Management Patterns

### Enum-Based State Machine Pattern

Use enums to represent entity lifecycle states:

```rust
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EscrowStatus {
    Pending = 0,   // Created, awaiting funding
    Funded = 1,    // Funds deposited
    Released = 2,  // Funds released
    Refunded = 3,  // Funds refunded
    Disputed = 4,  // Under dispute
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
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

### State Transition Validation

Always validate the current state before allowing transitions:

```rust
// Good: Explicit state validation
pub fn fund_escrow(
    env: Env,
    escrow_id: BytesN<32>,
    caller: Address,
) -> Result<(), EscrowError> {
    let mut escrow = EscrowStorage::get(&env, &escrow_id)
        .ok_or(EscrowError::EscrowNotFound)?;

    // Validate: only Pending → Funded is allowed
    if escrow.status != EscrowStatus::Pending {
        return Err(EscrowError::InvalidState);
    }

    AccessControl::is_depositor(&escrow, &caller)?;
    caller.require_auth();

    // Transition state
    escrow.status = EscrowStatus::Funded;
    EscrowStorage::save(&env, &escrow);

    Ok(())
}
```

### Checks-Effects-Interactions (CEI) Pattern

Order operations to prevent reentrancy attacks:

```rust
pub fn pay_rent(
    env: Env,
    from: Address,
    agreement_id: String,
    payment_amount: i128,
) -> Result<(), PaymentError> {
    // ═══ CHECKS ═══
    from.require_auth();
    let mut agreement = load_agreement(&env, &agreement_id)?;

    if agreement.status != AgreementStatus::Active {
        return Err(PaymentError::AgreementNotActive);
    }
    if from != agreement.tenant {
        return Err(PaymentError::NotTenant);
    }
    if payment_amount != agreement.monthly_rent {
        return Err(PaymentError::InvalidPaymentAmount);
    }

    // Calculate split
    let landlord_amount = (payment_amount * 90) / 100;
    let platform_amount = payment_amount - landlord_amount;

    // ═══ EFFECTS ═══ (state updates BEFORE external calls)
    agreement.payment_history.set(
        agreement.payment_history.len(),
        PaymentSplit { landlord_amount, platform_amount, /* ... */ },
    );
    agreement.next_payment_due = env.ledger().timestamp() + 2_592_000;
    save_agreement(&env, &agreement_id, &agreement);

    // ═══ INTERACTIONS ═══ (external calls AFTER state updates)
    let token = token::Client::new(&env, &agreement.payment_token);
    token.transfer(&from, &agreement.landlord, &landlord_amount);
    token.transfer(&from, &platform_collector, &platform_amount);

    Ok(())
}
```

**Why CEI matters:**
- If the token transfer calls back into our contract, state is already updated
- Prevents double-spend and reentrancy exploits
- Follows Solidity/Soroban security best practices

### Emergency Pause Pattern

Implement circuit-breaking for emergency situations:

```rust
#[contracttype]
pub struct PauseState {
    pub is_paused: bool,
    pub paused_at: u64,
    pub paused_by: Address,
    pub pause_reason: String,
}

// Pause check at the start of critical functions
fn ensure_not_paused(env: &Env) -> Result<(), RentalError> {
    if let Some(pause_state) = env
        .storage()
        .instance()
        .get::<_, PauseState>(&DataKey::PauseState)
    {
        if pause_state.is_paused {
            return Err(RentalError::ContractPaused);
        }
    }
    Ok(())
}

// Admin-only pause
pub fn pause(env: Env, admin: Address, reason: String) -> Result<(), RentalError> {
    verify_admin(&env, &admin)?;
    admin.require_auth();

    let state = PauseState {
        is_paused: true,
        paused_at: env.ledger().timestamp(),
        paused_by: admin,
        pause_reason: reason,
    };
    env.storage().instance().set(&DataKey::PauseState, &state);
    Ok(())
}
```

### Version Tracking Pattern

Track contract versions for upgrade management:

```rust
#[contracttype]
pub struct ContractVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub label: String,
    pub status: VersionStatus,
    pub hash: Bytes,
    pub updated_at: u64,
}

#[contracttype]
pub enum VersionStatus {
    Development,
    Staging,
    Production,
    Deprecated,
}
```

---

## Initialization Patterns

### One-Time Initialization Pattern

Prevent double initialization with a flag:

```rust
pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
    // Check if already initialized
    if env.storage().instance().has(&DataKey::Initialized) {
        return Err(Error::AlreadyInitialized);
    }

    // Set contract state
    let state = ContractState { admin: admin.clone() };
    env.storage().instance().set(&DataKey::State, &state);
    env.storage().instance().set(&DataKey::Initialized, &true);

    // Initialize counters
    env.storage().instance().set(&DataKey::PropertyCount, &0u32);

    // Emit initialization event
    events::contract_initialized(&env, admin);

    Ok(())
}
```

### Default Configuration Pattern

Provide sensible defaults that can be overridden:

```rust
pub fn get_timeout_config(env: &Env) -> TimeoutConfig {
    env.storage()
        .instance()
        .get(&DataKey::TimeoutConfig)
        .unwrap_or(TimeoutConfig {
            escrow_timeout_days: 14,   // 2 weeks default
            dispute_timeout_days: 30,  // 1 month default
            payment_timeout_days: 7,   // 1 week default
        })
}

pub fn get_rate_limit_config(env: &Env) -> RateLimitConfig {
    env.storage()
        .persistent()
        .get(&DataKey::RateLimitConfig)
        .unwrap_or(RateLimitConfig {
            max_calls_per_block: 10,
            max_calls_per_user_per_day: 100,
            cooldown_blocks: 0,
        })
}
```

---

## Upgrade Patterns

### Contract Upgrade Pattern

Soroban contracts can be upgraded by deploying new WASM and migrating state:

```rust
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
    verify_admin(&env, &admin)?;
    admin.require_auth();

    // Update version tracking
    let version = ContractVersion {
        major: 2,
        minor: 0,
        patch: 0,
        label: String::from_str(&env, "v2.0.0"),
        status: VersionStatus::Production,
        hash: new_wasm_hash.into(),
        updated_at: env.ledger().timestamp(),
    };
    env.storage().instance().set(&DataKey::CurrentVersion, &version);

    // Deploy new WASM
    env.deployer().update_current_contract_wasm(new_wasm_hash);

    Ok(())
}
```

### State Migration Pattern

When upgrading, migrate storage format if needed:

```rust
pub fn migrate(env: Env, admin: Address) -> Result<(), Error> {
    verify_admin(&env, &admin)?;
    admin.require_auth();

    // Check migration hasn't been run
    if env.storage().instance().has(&DataKey::MigrationComplete) {
        return Err(Error::AlreadyMigrated);
    }

    // Perform state migration
    // Example: adding new field to existing data
    let count = get_escrow_count(&env);
    for i in 0..count {
        if let Some(mut escrow) = get_escrow_by_index(&env, i) {
            // Add new timeout_days field with default
            escrow.timeout_days = 14;
            save_escrow(&env, &escrow);
        }
    }

    env.storage().instance().set(&DataKey::MigrationComplete, &true);
    Ok(())
}
```

---

## Anti-Patterns

### Avoid: String Keys for Storage

```rust
// Bad: String keys are error-prone and not type-safe
env.storage().persistent().set(
    &String::from_str(&env, "escrow_123"),
    &escrow,
);

// Good: Use enum-based DataKey
env.storage().persistent().set(
    &DataKey::Escrow(escrow_id),
    &escrow,
);
```

### Avoid: Unbounded Iteration

```rust
// Bad: Iterating all escrows to find one (O(n))
pub fn find_escrow_by_depositor(env: &Env, depositor: &Address) -> Option<Escrow> {
    let count = get_count(env);
    for i in 0..count {
        let escrow = get_escrow_by_index(env, i)?;
        if escrow.depositor == *depositor {
            return Some(escrow);
        }
    }
    None
}

// Good: Use a direct lookup key (O(1))
pub fn get_escrow(env: &Env, escrow_id: &BytesN<32>) -> Option<Escrow> {
    let key = DataKey::Escrow(escrow_id.clone());
    env.storage().persistent().get::<_, Escrow>(&key)
}
```

### Avoid: External Calls Before State Updates

```rust
// Bad: Token transfer before state update (reentrancy risk)
pub fn release_funds_bad(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
    let escrow = get_escrow(&env, &escrow_id)?;

    // INTERACTION before EFFECT - vulnerable!
    let token = token::Client::new(&env, &escrow.token);
    token.transfer(&env.current_contract_address(), &escrow.beneficiary, &escrow.amount);

    // State update after transfer
    let mut escrow = escrow;
    escrow.status = EscrowStatus::Released;
    save_escrow(&env, &escrow);

    Ok(())
}

// Good: State update before token transfer (CEI pattern)
pub fn release_funds_good(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
    let mut escrow = get_escrow(&env, &escrow_id)?;

    // EFFECT before INTERACTION - safe!
    escrow.status = EscrowStatus::Released;
    save_escrow(&env, &escrow);

    // Transfer after state is finalized
    let token = token::Client::new(&env, &escrow.token);
    token.transfer(&env.current_contract_address(), &escrow.beneficiary, &escrow.amount);

    Ok(())
}
```

### Avoid: Missing Authorization Checks

```rust
// Bad: No auth check — anyone can call this
pub fn verify_property_bad(env: Env, property_id: String) -> Result<(), Error> {
    let mut property = get_property(&env, &property_id)?;
    property.verified = true;
    save_property(&env, &property);
    Ok(())
}

// Good: Admin auth required
pub fn verify_property_good(
    env: Env,
    admin: Address,
    property_id: String,
) -> Result<(), Error> {
    let state = get_state(&env).ok_or(Error::NotInitialized)?;
    if admin != state.admin {
        return Err(Error::Unauthorized);
    }
    admin.require_auth();

    let mut property = get_property(&env, &property_id)?;
    property.verified = true;
    save_property(&env, &property);
    Ok(())
}
```

### Avoid: Silent Failures

```rust
// Bad: Silently returning Ok on failure conditions
pub fn fund_escrow_bad(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
    if let Some(escrow) = get_escrow(&env, &escrow_id) {
        if escrow.status == EscrowStatus::Pending {
            // do funding...
        }
        // Silently succeeds even if status isn't Pending
    }
    // Silently succeeds even if escrow doesn't exist
    Ok(())
}

// Good: Explicit error returns
pub fn fund_escrow_good(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
    let escrow = get_escrow(&env, &escrow_id)
        .ok_or(Error::EscrowNotFound)?;

    if escrow.status != EscrowStatus::Pending {
        return Err(Error::InvalidState);
    }

    // do funding...
    Ok(())
}
```

### Avoid: Integer Overflow

```rust
// Bad: Direct arithmetic (potential overflow)
let total = amount * rate * days;

// Good: Use saturating arithmetic
let total = amount.saturating_mul(rate).saturating_mul(days);
```

---

## Performance Patterns

### Minimize Storage Reads

```rust
// Bad: Multiple reads of the same data
pub fn process_bad(env: &Env, id: &BytesN<32>) {
    let escrow = get_escrow(env, id).unwrap();
    validate_status(&escrow);

    let escrow = get_escrow(env, id).unwrap(); // Redundant read!
    update_escrow(env, &escrow);
}

// Good: Read once, reuse
pub fn process_good(env: &Env, id: &BytesN<32>) {
    let mut escrow = get_escrow(env, id).unwrap();
    validate_status(&escrow);
    update_escrow(env, &mut escrow);
    save_escrow(env, &escrow); // Single write
}
```

### Compact Data Structures

```rust
// Good: Minimal on-chain storage (~100 bytes per profile)
#[contracttype]
pub struct UserProfile {
    pub owner: Address,
    pub account_type: AccountType,
    pub display_name: String,     // Short string
    pub kyc_verified: bool,
    pub created_at: u64,
}

// Avoid: Storing large data on-chain
// Bad: Store metadata hash, not the full metadata
#[contracttype]
pub struct PropertyDetails {
    pub landlord: Address,
    pub property_id: String,
    pub metadata_hash: String,  // Good: hash reference to off-chain data
    pub verified: bool,
    pub registered_at: u64,
    pub verified_at: u64,
}
```

### Rate Limiting for Gas Protection

```rust
const BLOCKS_PER_DAY: u64 = 17280; // ~5 second blocks

pub fn check_rate_limit(
    env: &Env,
    user: &Address,
    function_name: &str,
) -> Result<(), Error> {
    let config = get_rate_limit_config(env);
    let current_block = env.ledger().sequence() as u64;

    // 1. Cooldown check (minimum blocks between calls)
    if config.cooldown_blocks > 0 && user_calls.last_call_block > 0 {
        let blocks_since = current_block.saturating_sub(user_calls.last_call_block);
        if blocks_since < config.cooldown_blocks as u64 {
            return Err(Error::CooldownNotMet);
        }
    }

    // 2. Daily per-user limit
    if user_calls.daily_count >= config.max_calls_per_user_per_day {
        return Err(Error::RateLimitExceeded);
    }

    // 3. Per-block global limit (prevents block stuffing)
    let block_calls: u32 = env.storage().temporary().get(&block_key).unwrap_or(0);
    if block_calls >= config.max_calls_per_block {
        return Err(Error::RateLimitExceeded);
    }

    // Update counters...
    Ok(())
}
```

---

## Testing Patterns

### Test Environment Setup

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, PropertyRegistryContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(PropertyRegistryContract, ());
        let client = PropertyRegistryContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn test_register_property() {
        let (env, client, _admin) = setup();
        let landlord = Address::generate(&env);
        let property_id = String::from_str(&env, "PROP-001");
        let metadata = String::from_str(&env, "QmHash123");

        client.register_property(&landlord, &property_id, &metadata);
        assert!(client.has_property(&property_id));
    }
}
```

### Authorization Testing

```rust
#[test]
fn test_unauthorized_verification() {
    let (env, client, _admin) = setup();
    let non_admin = Address::generate(&env);

    // Register a property first
    let landlord = Address::generate(&env);
    client.register_property(
        &landlord,
        &String::from_str(&env, "PROP-001"),
        &String::from_str(&env, "QmHash"),
    );

    // Attempt verification with non-admin should fail
    let result = client.try_verify_property(
        &non_admin,
        &String::from_str(&env, "PROP-001"),
    );
    assert!(result.is_err());
}
```

### State Transition Testing

```rust
#[test]
fn test_escrow_state_transitions() {
    let (env, client, tenant, landlord, arbiter, token) = setup_escrow();

    // Pending → Funded
    let escrow_id = client.create(&tenant, &landlord, &arbiter, &1000, &token);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Pending);

    client.fund_escrow(&escrow_id, &tenant);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Funded);

    // Funded → Disputed
    client.initiate_dispute(
        &escrow_id,
        &tenant,
        &String::from_str(&env, "Test dispute"),
    );
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Disputed);
}
```

### Error Case Testing

```rust
#[test]
fn test_duplicate_property_rejected() {
    let (env, client, _admin) = setup();
    let landlord = Address::generate(&env);
    let property_id = String::from_str(&env, "PROP-001");
    let metadata = String::from_str(&env, "QmHash");

    // First registration succeeds
    client.register_property(&landlord, &property_id, &metadata);

    // Second registration with same ID should fail
    let result = client.try_register_property(&landlord, &property_id, &metadata);
    assert!(result.is_err());
}

#[test]
fn test_empty_property_id_rejected() {
    let (env, client, _admin) = setup();
    let landlord = Address::generate(&env);

    let result = client.try_register_property(
        &landlord,
        &String::from_str(&env, ""),  // Empty ID
        &String::from_str(&env, "QmHash"),
    );
    assert!(result.is_err());
}
```

### Timeout Testing

```rust
#[test]
fn test_escrow_timeout_refund() {
    let (env, client, tenant, landlord, arbiter, token) = setup_escrow();

    let escrow_id = client.create(&tenant, &landlord, &arbiter, &1000, &token);
    client.fund_escrow(&escrow_id, &tenant);

    // Advance time past timeout (15 days > 14 day default)
    env.ledger().set_timestamp(env.ledger().timestamp() + 15 * 86_400);

    // Timeout should succeed
    client.release_escrow_on_timeout(&escrow_id);
    assert_eq!(client.get_escrow(&escrow_id).status, EscrowStatus::Refunded);
}

#[test]
fn test_escrow_timeout_too_early() {
    let (env, client, tenant, landlord, arbiter, token) = setup_escrow();

    let escrow_id = client.create(&tenant, &landlord, &arbiter, &1000, &token);
    client.fund_escrow(&escrow_id, &tenant);

    // Only 1 day passed (< 14 day default)
    env.ledger().set_timestamp(env.ledger().timestamp() + 86_400);

    // Timeout should fail
    let result = client.try_release_escrow_on_timeout(&escrow_id);
    assert!(result.is_err());
}
```

### Running Tests

```bash
# Run all contract tests
cargo test --all

# Run tests for a specific contract
cargo test -p escrow

# Run tests with output
cargo test -- --nocapture

# Run a specific test
cargo test test_escrow_lifecycle
```

---

## Related Documentation

- [Contract Architecture Overview](../../README.md) — Project structure and features
- [Benchmarking Guide](../performance/BENCHMARKING.md) — Performance measurement
- [Emergency Procedures](../security/EMERGENCY-PROCEDURES.md) — Emergency pause and recovery
- [Escrow Contract](../contracts/ESCROW.md) — Escrow contract documentation
- [Payment Contract](../contracts/PAYMENT.md) — Payment contract documentation
- [Property Registry Contract](../contracts/PROPERTY-REGISTRY.md) — Property registry documentation
- [Testing Strategy](../../contracts/dispute_resolution/README.md) — Dispute resolution testing
