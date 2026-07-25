# Smart Contract Architecture Overview

## System Architecture

### High-Level Design

The Chioma smart contract system is built on Soroban (Stellar's smart contract platform) and implements a modular architecture with 8 specialized contracts that work together to enable secure rental agreements, payments, and dispute resolution on the blockchain.

```
┌─────────────────────────────────────────────────────────────┐
│                    Chioma Smart Contracts                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Chioma     │  │   Payment    │  │   Escrow     │       │
│  │   (Main)     │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                  │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Dispute    │  │   Rent       │  │   Property   │       │
│  │ Resolution   │  │  Obligation  │  │   Registry   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                 │                  │               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Agent      │  │   User       │                         │
│  │   Registry   │  │   Profile    │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Contract Modules

#### 1. Chioma (Main Contract)

**Purpose**: Central contract managing system state and emergency controls

**Key Features**:

- Emergency pause mechanism (admin-only)
- System configuration management
- Contract version tracking
- Event emission for monitoring

**Key Functions**:

```rust
pub fn pause(env: Env) -> Result<(), Error>
pub fn unpause(env: Env) -> Result<(), Error>
pub fn is_paused(env: Env) -> bool
pub fn get_version(env: Env) -> String
pub fn set_config(env: Env, key: String, value: String) -> Result<(), Error>
```

**Storage Keys**:

- `paused` - Boolean indicating if system is paused
- `admin` - Admin address
- `version` - Contract version
- `config:*` - Configuration key-value pairs

#### 2. Payment Contract

**Purpose**: Handle payment processing and fund transfers

**Key Features**:

- Payment creation and tracking
- Refund processing
- Payment status management
- Event emission for payment lifecycle

**Key Functions**:

```rust
pub fn create_payment(
  env: Env,
  from: Address,
  to: Address,
  amount: i128,
  reference: String
) -> Result<String, Error>

pub fn get_payment(env: Env, payment_id: String) -> Result<Payment, Error>

pub fn refund_payment(env: Env, payment_id: String) -> Result<(), Error>

pub fn get_payment_status(env: Env, payment_id: String) -> Result<PaymentStatus, Error>
```

**Data Structures**:

```rust
pub struct Payment {
  pub id: String,
  pub from: Address,
  pub to: Address,
  pub amount: i128,
  pub status: PaymentStatus,
  pub reference: String,
  pub created_at: u64,
  pub completed_at: Option<u64>,
}

pub enum PaymentStatus {
  Pending,
  Completed,
  Failed,
  Refunded,
}
```

#### 3. Escrow Contract

**Purpose**: Secure fund holding with timeout protection

**Key Features**:

- Escrow creation and management
- Timeout-based fund release
- Dispute-based fund release
- Automatic cleanup

**Key Functions**:

```rust
pub fn create_escrow(
  env: Env,
  payer: Address,
  payee: Address,
  amount: i128,
  timeout_seconds: u64,
  reference: String
) -> Result<String, Error>

pub fn release_escrow(env: Env, escrow_id: String) -> Result<(), Error>

pub fn refund_escrow(env: Env, escrow_id: String) -> Result<(), Error>

pub fn get_escrow(env: Env, escrow_id: String) -> Result<Escrow, Error>
```

**Data Structures**:

```rust
pub struct Escrow {
  pub id: String,
  pub payer: Address,
  pub payee: Address,
  pub amount: i128,
  pub status: EscrowStatus,
  pub timeout_at: u64,
  pub created_at: u64,
  pub reference: String,
}

pub enum EscrowStatus {
  Held,
  Released,
  Refunded,
  Disputed,
}
```

#### 4. Dispute Resolution Contract

**Purpose**: Manage disputes with voting-based resolution

**Key Features**:

- Dispute creation and tracking
- Voting mechanism
- Resolution enforcement
- Timeout-based auto-resolution

**Key Functions**:

```rust
pub fn create_dispute(
  env: Env,
  initiator: Address,
  respondent: Address,
  escrow_id: String,
  reason: String
) -> Result<String, Error>

pub fn vote(
  env: Env,
  dispute_id: String,
  voter: Address,
  vote: VoteOption
) -> Result<(), Error>

pub fn resolve_dispute(env: Env, dispute_id: String) -> Result<(), Error>

pub fn get_dispute(env: Env, dispute_id: String) -> Result<Dispute, Error>
```

**Data Structures**:

```rust
pub struct Dispute {
  pub id: String,
  pub initiator: Address,
  pub respondent: Address,
  pub escrow_id: String,
  pub reason: String,
  pub status: DisputeStatus,
  pub votes_for: u32,
  pub votes_against: u32,
  pub created_at: u64,
  pub voting_end_at: u64,
  pub resolution: Option<DisputeResolution>,
}

pub enum VoteOption {
  For,
  Against,
}

pub enum DisputeStatus {
  Open,
  Voting,
  Resolved,
  Closed,
}

pub enum DisputeResolution {
  PayeeWins,
  PayerWins,
  Split,
}
```

#### 5. Rent Obligation NFT Contract

**Purpose**: Create NFT-backed rent obligations

**Key Features**:

- NFT minting for rent obligations
- Ownership tracking
- Metadata storage
- Transfer restrictions

**Key Functions**:

```rust
pub fn mint_rent_obligation(
  env: Env,
  tenant: Address,
  landlord: Address,
  amount: i128,
  due_date: u64,
  property_id: String
) -> Result<String, Error>

pub fn get_nft(env: Env, nft_id: String) -> Result<RentObligationNFT, Error>

pub fn transfer_nft(
  env: Env,
  nft_id: String,
  from: Address,
  to: Address
) -> Result<(), Error>

pub fn burn_nft(env: Env, nft_id: String) -> Result<(), Error>
```

**Data Structures**:

```rust
pub struct RentObligationNFT {
  pub id: String,
  pub tenant: Address,
  pub landlord: Address,
  pub amount: i128,
  pub due_date: u64,
  pub property_id: String,
  pub status: NFTStatus,
  pub created_at: u64,
  pub metadata: String,
}

pub enum NFTStatus {
  Active,
  Paid,
  Overdue,
  Burned,
}
```

#### 6. Property Registry Contract

**Purpose**: Register and verify properties on-chain

**Key Features**:

- Property registration
- Ownership verification
- Metadata storage
- Status tracking

**Key Functions**:

```rust
pub fn register_property(
  env: Env,
  owner: Address,
  address: String,
  metadata: String
) -> Result<String, Error>

pub fn get_property(env: Env, property_id: String) -> Result<Property, Error>

pub fn update_property(
  env: Env,
  property_id: String,
  metadata: String
) -> Result<(), Error>

pub fn verify_property(env: Env, property_id: String) -> Result<(), Error>
```

**Data Structures**:

```rust
pub struct Property {
  pub id: String,
  pub owner: Address,
  pub address: String,
  pub metadata: String,
  pub verified: bool,
  pub created_at: u64,
  pub updated_at: u64,
}
```

#### 7. Agent Registry Contract

**Purpose**: Manage real estate agents and their permissions

**Key Features**:

- Agent registration
- Permission management
- Commission tracking
- Status management

**Key Functions**:

```rust
pub fn register_agent(
  env: Env,
  agent: Address,
  name: String,
  metadata: String
) -> Result<(), Error>

pub fn grant_permission(
  env: Env,
  agent: Address,
  landlord: Address,
  permission: String
) -> Result<(), Error>

pub fn revoke_permission(
  env: Env,
  agent: Address,
  landlord: Address,
  permission: String
) -> Result<(), Error>

pub fn get_agent(env: Env, agent: Address) -> Result<Agent, Error>
```

**Data Structures**:

```rust
pub struct Agent {
  pub address: Address,
  pub name: String,
  pub metadata: String,
  pub active: bool,
  pub created_at: u64,
  pub permissions: Vec<String>,
}
```

#### 8. User Profile Contract

**Purpose**: Store user profiles and preferences on-chain

**Key Features**:

- Profile creation and management
- Preference storage
- Reputation tracking
- Status management

**Key Functions**:

```rust
pub fn create_profile(
  env: Env,
  user: Address,
  name: String,
  metadata: String
) -> Result<(), Error>

pub fn get_profile(env: Env, user: Address) -> Result<UserProfile, Error>

pub fn update_profile(
  env: Env,
  user: Address,
  metadata: String
) -> Result<(), Error>

pub fn update_reputation(
  env: Env,
  user: Address,
  delta: i32
) -> Result<(), Error>
```

**Data Structures**:

```rust
pub struct UserProfile {
  pub user: Address,
  pub name: String,
  pub metadata: String,
  pub reputation: i32,
  pub created_at: u64,
  pub updated_at: u64,
}
```

## Contract Interactions

### Payment Flow

```
Tenant → Payment Contract → Escrow Contract → Landlord
  │           │                  │              │
  └─ Create   └─ Track Status    └─ Hold Funds ─┘
     Payment      & Events          (Timeout)
```

### Dispute Resolution Flow

```
Tenant/Landlord → Dispute Contract → Voting → Resolution
      │                │              │          │
      └─ Initiate      └─ Track       └─ Vote   └─ Enforce
         Dispute          Status         & Tally   (Release/Refund)
```

### Rent Obligation Flow

```
Landlord → Rent Obligation → NFT Minting → Tenant
   │            │                │           │
   └─ Create    └─ Track         └─ Mint    └─ Own
      Obligation   Obligation        NFT       NFT
```

## Data Flow

### Request/Response Flow

**Payment Creation**:

```
Client Request
    ↓
Payment Contract
    ├─ Validate input
    ├─ Check authorization
    ├─ Create payment record
    ├─ Emit event
    └─ Return payment ID
    ↓
Client Response
```

**Escrow Release**:

```
Client Request
    ↓
Escrow Contract
    ├─ Validate escrow exists
    ├─ Check timeout
    ├─ Check authorization
    ├─ Transfer funds
    ├─ Update status
    ├─ Emit event
    └─ Return success
    ↓
Client Response
```

## Design Patterns

### 1. Storage Pattern

**Key-Value Storage**:

```rust
// Store data with unique keys
env.storage().persistent().set(&key, &value);

// Retrieve data
let value: Value = env.storage().persistent().get(&key)?;

// Delete data
env.storage().persistent().remove(&key);
```

**Example**:

```rust
// Store payment
let payment_key = format!("payment:{}", payment_id);
env.storage().persistent().set(&payment_key, &payment);

// Retrieve payment
let payment: Payment = env.storage().persistent().get(&payment_key)?;
```

### 2. Event Pattern

**Event Emission**:

```rust
// Define event
pub struct PaymentCreatedEvent {
  pub payment_id: String,
  pub from: Address,
  pub to: Address,
  pub amount: i128,
}

// Emit event
env.events().publish(
  ("payment", "created"),
  PaymentCreatedEvent {
    payment_id: payment_id.clone(),
    from: from.clone(),
    to: to.clone(),
    amount,
  }
);
```

### 3. Authorization Pattern

**Address Verification**:

```rust
// Require authorization
pub fn create_payment(
  env: Env,
  from: Address,
  to: Address,
  amount: i128,
) -> Result<String, Error> {
  // Verify caller is authorized
  from.require_auth();

  // Proceed with operation
  // ...
}
```

### 4. Timeout Pattern

**Time-Based Logic**:

```rust
// Check if timeout expired
pub fn release_escrow(env: Env, escrow_id: String) -> Result<(), Error> {
  let escrow = get_escrow(&env, &escrow_id)?;
  let current_time = env.ledger().timestamp();

  if current_time < escrow.timeout_at {
    return Err(Error::TimeoutNotReached);
  }

  // Release funds
  // ...
}
```

### 5. Idempotency Pattern

**Duplicate Prevention**:

```rust
// Use unique identifiers to prevent duplicates
pub fn create_payment(
  env: Env,
  from: Address,
  to: Address,
  amount: i128,
  idempotency_key: String,
) -> Result<String, Error> {
  // Check if payment already exists
  let existing_key = format!("idempotency:{}", idempotency_key);
  if let Ok(payment_id) = env.storage().persistent().get::<_, String>(&existing_key) {
    return Ok(payment_id);
  }

  // Create new payment
  let payment_id = generate_id();
  env.storage().persistent().set(&existing_key, &payment_id);

  // ...
  Ok(payment_id)
}
```

## Storage Strategy

### Storage Keys

**Naming Convention**: `entity:id:field`

**Examples**:

```
payment:123:status
payment:123:amount
escrow:456:timeout_at
dispute:789:votes_for
user:alice:reputation
property:prop1:verified
```

### Storage Optimization

**Compact Storage**:

```rust
// Store related data together
pub struct PaymentData {
  pub from: Address,
  pub to: Address,
  pub amount: i128,
  pub status: PaymentStatus,
  pub created_at: u64,
}

// Single storage operation
env.storage().persistent().set(&payment_key, &payment_data);
```

**Lazy Loading**:

```rust
// Load only required fields
pub fn get_payment_status(env: Env, payment_id: String) -> Result<PaymentStatus, Error> {
  let key = format!("payment:{}:status", payment_id);
  env.storage().persistent().get(&key)
}
```

## Event Logging

### Event Types

**Payment Events**:

- `payment:created` - Payment created
- `payment:completed` - Payment completed
- `payment:failed` - Payment failed
- `payment:refunded` - Payment refunded

**Escrow Events**:

- `escrow:created` - Escrow created
- `escrow:released` - Escrow released
- `escrow:refunded` - Escrow refunded
- `escrow:disputed` - Escrow disputed

**Dispute Events**:

- `dispute:created` - Dispute created
- `dispute:voted` - Vote cast
- `dispute:resolved` - Dispute resolved

**NFT Events**:

- `nft:minted` - NFT minted
- `nft:transferred` - NFT transferred
- `nft:burned` - NFT burned

### Event Monitoring

**Event Subscription**:

```typescript
// Subscribe to events in backend
const eventStream = sorobanClient.subscribeToEvents({
  filters: [
    { type: "payment", action: "created" },
    { type: "escrow", action: "released" },
  ],
});

eventStream.on("event", (event) => {
  console.log("Event received:", event);
  // Process event
});
```

## Error Handling

### Error Types

```rust
pub enum Error {
  // Authorization errors
  Unauthorized,
  InsufficientPermission,

  // Validation errors
  InvalidAmount,
  InvalidAddress,
  InvalidTimeout,

  // State errors
  PaymentNotFound,
  EscrowNotFound,
  DisputeNotFound,

  // Business logic errors
  InsufficientBalance,
  TimeoutNotReached,
  DisputeAlreadyResolved,

  // System errors
  StorageError,
  EventError,
}
```

### Error Handling Pattern

```rust
pub fn create_payment(
  env: Env,
  from: Address,
  to: Address,
  amount: i128,
) -> Result<String, Error> {
  // Validate input
  if amount <= 0 {
    return Err(Error::InvalidAmount);
  }

  if to == from {
    return Err(Error::InvalidAddress);
  }

  // Check authorization
  from.require_auth();

  // Check balance
  let balance = get_balance(&env, &from)?;
  if balance < amount {
    return Err(Error::InsufficientBalance);
  }

  // Create payment
  let payment_id = generate_id();
  let payment = Payment {
    id: payment_id.clone(),
    from: from.clone(),
    to: to.clone(),
    amount,
    status: PaymentStatus::Pending,
    created_at: env.ledger().timestamp(),
    completed_at: None,
  };

  // Store payment
  let key = format!("payment:{}", payment_id);
  env.storage().persistent().set(&key, &payment);

  // Emit event
  env.events().publish(
    ("payment", "created"),
    PaymentCreatedEvent {
      payment_id: payment_id.clone(),
      from,
      to,
      amount,
    }
  );

  Ok(payment_id)
}
```

## Security Architecture

### Authorization Layers

**Layer 1: Address Verification**

```rust
// Verify caller is authorized
from.require_auth();
```

**Layer 2: Permission Checks**

```rust
// Check if user has permission
if !has_permission(&env, &user, &action) {
  return Err(Error::InsufficientPermission);
}
```

**Layer 3: Business Logic Validation**

```rust
// Validate business rules
if amount > max_amount {
  return Err(Error::InvalidAmount);
}
```

### Reentrancy Protection

**Checks-Effects-Interactions (CEI) Pattern**:

```rust
pub fn withdraw(env: Env, amount: i128) -> Result<(), Error> {
  // Checks
  let user = get_user(&env)?;
  if user.balance < amount {
    return Err(Error::InsufficientBalance);
  }

  // Effects (state update first)
  let mut user = user;
  user.balance -= amount;
  set_user(&env, &user)?;

  // Interactions (after state update)
  transfer_funds(&env, &user.address, amount)?;

  Ok(())
}
```

## Performance Considerations

### Optimization Strategies

**1. Batch Operations**:

```rust
// Process multiple payments in one transaction
pub fn batch_create_payments(
  env: Env,
  payments: Vec<PaymentInput>,
) -> Result<Vec<String>, Error> {
  let mut payment_ids = Vec::new();

  for payment in payments {
    let id = create_payment(
      env.clone(),
      payment.from,
      payment.to,
      payment.amount,
    )?;
    payment_ids.push(id);
  }

  Ok(payment_ids)
}
```

**2. Caching**:

```rust
// Cache frequently accessed data
pub fn get_user_profile(env: Env, user: Address) -> Result<UserProfile, Error> {
  let cache_key = format!("cache:profile:{}", user);

  // Check cache
  if let Ok(cached) = env.storage().temporary().get::<_, UserProfile>(&cache_key) {
    return Ok(cached);
  }

  // Load from persistent storage
  let profile = load_profile(&env, &user)?;

  // Cache for 1 hour
  env.storage().temporary().set(&cache_key, &profile, 3600);

  Ok(profile)
}
```

**3. Lazy Loading**:

```rust
// Load only required data
pub fn get_payment_status(env: Env, payment_id: String) -> Result<PaymentStatus, Error> {
  let key = format!("payment:{}:status", payment_id);
  env.storage().persistent().get(&key)
}
```

## Scalability

### Horizontal Scaling

**Contract Sharding**:

- Separate contracts for different entity types
- Independent storage and state management
- Parallel execution capability

**Load Distribution**:

- Multiple contract instances
- Load balancer routing
- State synchronization

### Vertical Scaling

**Storage Optimization**:

- Compact data structures
- Efficient key naming
- Lazy loading patterns

**Computation Optimization**:

- Batch operations
- Caching strategies
- Efficient algorithms

## Related Documentation

- [Design Patterns Guide](./DESIGN-PATTERNS.md)
- [Storage Strategy](./STORAGE-STRATEGY.md)
- [Event Logging](./EVENT-LOGGING.md)
- [Security Architecture](../security/SECURITY-AUDIT.md)

## Support & Escalation

**For Contract Issues**:

1. Check contract logs
2. Review this documentation
3. Check recent contract deployments
4. Contact blockchain team: blockchain@chioma.io
5. Escalate to platform lead if critical

**Blockchain Team Contact**: blockchain@chioma.io
**Emergency Hotline**: [contact info]
