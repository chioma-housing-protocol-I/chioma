# Payment Contract Documentation

## Table of Contents

- [Contract Overview](#contract-overview)
- [Public Functions](#public-functions)
- [Storage Structure](#storage-structure)
- [Events](#events)
- [Error Codes](#error-codes)
- [Payment Workflow](#payment-workflow)
- [Fee Handling](#fee-handling)
- [Refunds](#refunds)
- [Usage Examples](#usage-examples)
- [Integration](#integration)

---

## Contract Overview

The **Payment** contract handles rent payment processing for the Chioma housing protocol. It supports one-time rent payments with automatic commission splitting (90/10 landlord/platform), recurring payment schedules with multiple frequencies, late fee management, and failed payment tracking with retry capabilities.

### Purpose

- Process rent payments with automatic fee splitting between landlord and platform
- Support recurring payment schedules (Daily, Weekly, BiWeekly, Monthly, Quarterly, Annually)
- Calculate and apply late fees with configurable grace periods
- Track payment history and provide audit trails
- Enable automatic processing of due payments (keeper/oracle style)

### Key Features

| Feature | Description |
|---|---|
| **Rent Payment Processing** | 90/10 split between landlord and platform |
| **Recurring Payments** | Automated payment schedules with multiple frequencies |
| **Late Fee Management** | Configurable late fees with grace periods and caps |
| **Fee Splitting** | Automatic commission split (landlord/agent or landlord/platform) |
| **Failed Payment Tracking** | Track and retry failed recurring payments |
| **Rate Limiting** | Per-user and per-block rate limits to prevent abuse |
| **Payment History** | Full audit trail of all payments and executions |

### Architecture

The contract follows a modular architecture with separation of concerns:

```
payment/
├── src/
│   ├── lib.rs              # Contract entry point and public API
│   ├── payment_impl.rs     # Payment processing and commission splitting
│   ├── late_fee.rs         # Late fee calculation (simple and compounding)
│   ├── storage.rs          # Storage key definitions
│   ├── types.rs            # Data structures and enums
│   ├── errors.rs           # Error codes
│   ├── events.rs           # Event definitions and emission helpers
│   ├── rate_limit.rs       # Rate limiting module
│   ├── tests.rs            # Core payment tests
│   ├── tests_recurring.rs  # Recurring payment tests
│   └── tests_rate_limit.rs # Rate limiting tests
```

---

## Public Functions

### Payment Processing Functions

#### `pay_rent`

Process a rent payment with automatic 90/10 split between landlord and platform. Follows the Checks-Effects-Interactions pattern for reentrancy safety.

```rust
pub fn pay_rent(
    env: Env,
    from: Address,
    agreement_id: String,
    payment_amount: i128,
) -> Result<(), PaymentError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `from` | `Address` | Tenant making the payment (requires auth) |
| `agreement_id` | `String` | Rental agreement identifier |
| `payment_amount` | `i128` | Amount to pay (must match monthly rent) |

**Returns:** `Result<(), PaymentError>`

**Errors:**
- `AgreementNotFound` (13) — Agreement does not exist
- `AgreementNotActive` (10) — Agreement is not in `Active` status
- `NotTenant` (14) — Caller is not the tenant on this agreement
- `InvalidPaymentAmount` (17) — Amount is zero, negative, or doesn't match monthly rent
- `PaymentNotDue` (18) — Payment is not yet due (before `next_payment_due`)
- `PaymentFailed` (12) — Platform fee collector not configured
- `RateLimitExceeded` (27) — Rate limit exceeded
- `CooldownNotMet` (28) — Cooldown period not met

**Authorization:** Requires `from.require_auth()`

**Payment Split:**
- 90% → Landlord
- 10% → Platform fee collector

**Example:**

```rust
client.pay_rent(
    &tenant,
    &String::from_str(&env, "AGR-001"),
    &1_000_000, // 1 USDC monthly rent
);
```

#### `set_platform_fee_collector`

Set the platform fee collector address for receiving the 10% platform fee.

```rust
pub fn set_platform_fee_collector(env: Env, collector: Address)
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `collector` | `Address` | Platform fee collector address |

**Authorization:** Requires `collector.require_auth()`

**Example:**

```rust
client.set_platform_fee_collector(&platform_address);
```

---

### Query Functions

#### `get_payment`

Retrieve a payment record by its ID.

```rust
pub fn get_payment(env: Env, payment_id: String) -> Result<PaymentRecord, PaymentError>
```

**Returns:** `Result<PaymentRecord, PaymentError>`

**Errors:**
- `PaymentNotFound` (11) — No payment with this ID

#### `get_payment_count`

Get the total number of payments processed.

```rust
pub fn get_payment_count(env: Env) -> u32
```

**Returns:** `u32` — Total payment count

#### `get_total_paid`

Get the total amount paid for a specific agreement.

```rust
pub fn get_total_paid(env: Env, agreement_id: String) -> Result<i128, PaymentError>
```

**Returns:** `Result<i128, PaymentError>` — Total amount paid across all payments

#### `get_payment_split`

Get payment details for a specific month of an agreement.

```rust
pub fn get_payment_split(
    env: Env,
    agreement_id: String,
    month: u32,
) -> Result<PaymentSplit, PaymentError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `agreement_id` | `String` | Agreement identifier |
| `month` | `u32` | Month index (0-based) |

**Returns:** `Result<PaymentSplit, PaymentError>`

**Errors:**
- `AgreementNotFound` (13) — Agreement does not exist
- `PaymentNotFound` (11) — No payment for this month

---

### Recurring Payment Functions

#### `create_recurring_payment`

Create a recurring payment schedule linked to a rental agreement.

```rust
pub fn create_recurring_payment(
    env: Env,
    agreement_id: String,
    amount: i128,
    frequency: PaymentFrequency,
    start_date: u64,
    end_date: u64,
    auto_renew: bool,
) -> Result<String, PaymentError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `agreement_id` | `String` | Rental agreement identifier |
| `amount` | `i128` | Payment amount (must match monthly rent) |
| `frequency` | `PaymentFrequency` | Payment frequency |
| `start_date` | `u64` | First payment date (Unix timestamp) |
| `end_date` | `u64` | Schedule end date (Unix timestamp) |
| `auto_renew` | `bool` | Whether to auto-renew after end date |

**Returns:** `Result<String, PaymentError>` — Recurring payment ID

**Errors:**
- `AgreementNotFound` (13) — Agreement does not exist
- `InvalidPaymentAmount` (17) — Amount is invalid or doesn't match rent
- `InvalidRecurringDates` (20) — Start date >= end date

**Authorization:** Requires `agreement.tenant.require_auth()`

**Example:**

```rust
let recurring_id = client.create_recurring_payment(
    &String::from_str(&env, "AGR-001"),
    &1_000_000,                // 1 USDC
    &PaymentFrequency::Monthly,
    &1700000000,               // Start date
    &1731536000,               // End date (1 year later)
    &true,                     // Auto-renew
);
```

#### `execute_recurring_payment`

Execute a due recurring payment. Requires payer authorization.

```rust
pub fn execute_recurring_payment(env: Env, recurring_id: String) -> Result<(), PaymentError>
```

**Errors:**
- `RecurringPaymentNotFound` (19) — Recurring payment does not exist
- `RecurringPaymentNotActive` (21) — Payment is not in `Active` status
- `RecurringPaymentAlreadyCompleted` (24) — Payment schedule is complete
- `PaymentNotDue` (18) — Payment not yet due

**Authorization:** Requires `payer.require_auth()`

#### `pause_recurring_payment`

Pause an active recurring payment schedule.

```rust
pub fn pause_recurring_payment(env: Env, recurring_id: String) -> Result<(), PaymentError>
```

**Errors:**
- `RecurringPaymentNotFound` (19) — Not found
- `RecurringPaymentNotActive` (21) — Not in `Active` status
- `RecurringPaymentAlreadyCancelled` (23) — Already cancelled
- `RecurringPaymentAlreadyCompleted` (24) — Already completed

**Authorization:** Requires `payer.require_auth()`

#### `resume_recurring_payment`

Resume a paused recurring payment schedule.

```rust
pub fn resume_recurring_payment(env: Env, recurring_id: String) -> Result<(), PaymentError>
```

**Errors:**
- `RecurringPaymentNotFound` (19) — Not found
- `RecurringPaymentNotPaused` (22) — Not in `Paused` status

**Authorization:** Requires `payer.require_auth()`

#### `cancel_recurring_payment`

Cancel a recurring payment schedule permanently.

```rust
pub fn cancel_recurring_payment(env: Env, recurring_id: String) -> Result<(), PaymentError>
```

**Errors:**
- `RecurringPaymentNotFound` (19) — Not found
- `RecurringPaymentAlreadyCancelled` (23) — Already cancelled

**Authorization:** Requires `payer.require_auth()`

#### `get_recurring_payment`

Retrieve a recurring payment by ID.

```rust
pub fn get_recurring_payment(
    env: Env,
    recurring_id: String,
) -> Result<RecurringPayment, PaymentError>
```

#### `get_payment_executions`

Get all execution records for a recurring payment.

```rust
pub fn get_payment_executions(
    env: Env,
    recurring_id: String,
) -> Result<Vec<PaymentExecution>, PaymentError>
```

#### `process_due_payments`

Process all due recurring payments automatically. This is a keeper/oracle-style function that iterates through all active recurring payments and executes those that are due.

```rust
pub fn process_due_payments(env: Env) -> Result<Vec<String>, PaymentError>
```

**Returns:** `Result<Vec<String>, PaymentError>` — List of processed recurring payment IDs

#### `get_due_payments`

Get a list of all recurring payments that are currently due.

```rust
pub fn get_due_payments(env: Env) -> Result<Vec<String>, PaymentError>
```

**Returns:** `Result<Vec<String>, PaymentError>` — List of due recurring payment IDs

#### `retry_failed_payment`

Retry a previously failed recurring payment.

```rust
pub fn retry_failed_payment(env: Env, recurring_id: String) -> Result<(), PaymentError>
```

**Errors:**
- `RecurringPaymentNotFound` (19) — Not found
- `RecurringPaymentNotFailed` (26) — Not in `Failed` status
- `RecurringPaymentExecutionFailed` (25) — Retry execution failed

**Authorization:** Requires `payer.require_auth()`

#### `get_failed_payments`

Get a list of all currently failed recurring payment IDs.

```rust
pub fn get_failed_payments(env: Env) -> Result<Vec<String>, PaymentError>
```

---

### Late Fee Functions

#### `set_late_fee_config`

Set or update the late fee configuration for an agreement. Only the landlord can configure late fees.

```rust
pub fn set_late_fee_config(
    env: Env,
    agreement_id: String,
    late_fee_percentage: u32,
    grace_period_days: u32,
    max_late_fee: i128,
    compounding: bool,
) -> Result<(), PaymentError>
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `env` | `Env` | Soroban environment |
| `agreement_id` | `String` | Agreement identifier |
| `late_fee_percentage` | `u32` | Fee percentage (1-100) |
| `grace_period_days` | `u32` | Days after due date before fee applies |
| `max_late_fee` | `i128` | Maximum fee cap (0 = no cap) |
| `compounding` | `bool` | Whether to compound daily |

**Errors:**
- `AgreementNotFound` (13) — Agreement does not exist
- `InvalidLateFeePercentage` (33) — Percentage is 0 or > 100

**Authorization:** Requires `agreement.landlord.require_auth()`

**Example:**

```rust
client.set_late_fee_config(
    &String::from_str(&env, "AGR-001"),
    &5,           // 5% late fee
    &3,           // 3-day grace period
    &500_000,     // Max 0.5 USDC cap
    &false,       // Simple (non-compounding)
);
```

#### `get_late_fee_config`

Retrieve the late fee configuration for an agreement.

```rust
pub fn get_late_fee_config(
    env: Env,
    agreement_id: String,
) -> Result<LateFeeConfig, PaymentError>
```

**Errors:**
- `LateFeeConfigNotFound` (29) — No config set for this agreement

#### `calculate_late_fee`

Calculate the late fee for a payment given specific days late. Does not persist the result.

```rust
pub fn calculate_late_fee(
    env: Env,
    agreement_id: String,
    payment_id: String,
    days_late: u32,
) -> Result<i128, PaymentError>
```

**Returns:** `Result<i128, PaymentError>` — Calculated late fee amount

#### `apply_late_fee`

Apply a late fee to a specific payment. Automatically calculates days late from the current ledger timestamp versus the agreement's payment due date.

```rust
pub fn apply_late_fee(
    env: Env,
    agreement_id: String,
    payment_id: String,
) -> Result<LateFeeRecord, PaymentError>
```

**Returns:** `Result<LateFeeRecord, PaymentError>`

**Errors:**
- `LateFeeAlreadyApplied` (31) — Fee already applied to this payment
- `AgreementNotFound` (13) — Agreement does not exist
- `LateFeeConfigNotFound` (29) — No late fee config
- `PaymentNotLate` (34) — Payment is within grace period

#### `get_late_fee_record`

Retrieve a previously applied late fee record.

```rust
pub fn get_late_fee_record(
    env: Env,
    payment_id: String,
) -> Result<LateFeeRecord, PaymentError>
```

**Errors:**
- `LateFeeRecordNotFound` (30) — No late fee record for this payment

#### `waive_late_fee`

Waive a late fee. Only the landlord can waive fees.

```rust
pub fn waive_late_fee(
    env: Env,
    agreement_id: String,
    payment_id: String,
    reason: String,
) -> Result<(), PaymentError>
```

**Errors:**
- `AgreementNotFound` (13) — Agreement does not exist
- `LateFeeRecordNotFound` (30) — No late fee record
- `LateFeeAlreadyWaived` (32) — Fee already waived

**Authorization:** Requires `agreement.landlord.require_auth()`

---

## Storage Structure

### Storage Keys

```rust
#[contracttype]
pub enum DataKey {
    /// Individual payment record: DataKey::Payment(payment_id) => PaymentRecord
    Payment(String),
    /// Payment record by agreement and number: DataKey::PaymentRecord(agreement_id, number)
    PaymentRecord(String, u32),
    /// Total payment counter (instance storage)
    PaymentCount,
    /// Platform fee collector address (instance storage)
    PlatformFeeCollector,
    /// Rent agreement data: DataKey::Agreement(agreement_id) => RentAgreement
    Agreement(String),
    /// Recurring payment: DataKey::RecurringPayment(recurring_id) => RecurringPayment
    RecurringPayment(String),
    /// Recurring payment counter (instance storage)
    RecurringPaymentCount,
    /// Payment executions: DataKey::PaymentExecutions(recurring_id) => Vec<PaymentExecution>
    PaymentExecutions(String),
    /// List of failed recurring payment IDs (persistent storage)
    FailedRecurringPayments,
    /// Rate limiting configuration (persistent storage)
    RateLimitConfig,
    /// Per-user call tracking: DataKey::UserCallCount(user, function_name)
    UserCallCount(Address, String),
    /// Per-block call tracking: DataKey::BlockCallCount(block, function_name)
    BlockCallCount(u64, String),
    /// Late fee config: DataKey::LateFeeConfig(agreement_id) => LateFeeConfig
    LateFeeConfig(String),
    /// Late fee record: DataKey::LateFeeRecord(payment_id) => LateFeeRecord
    LateFeeRecord(String),
}
```

### Storage Layout

| Key | Storage Type | Value Type | Description |
|---|---|---|---|
| `Payment(id)` | Persistent | `PaymentRecord` | Individual payment record |
| `PaymentRecord(agr, num)` | Persistent | `PaymentRecord` | Payment by agreement + number |
| `Agreement(id)` | Persistent | `RentAgreement` | Rent agreement data |
| `RecurringPayment(id)` | Persistent | `RecurringPayment` | Recurring payment schedule |
| `PaymentExecutions(id)` | Persistent | `Vec<PaymentExecution>` | Execution history |
| `FailedRecurringPayments` | Persistent | `Vec<String>` | Failed payment IDs |
| `LateFeeConfig(id)` | Persistent | `LateFeeConfig` | Late fee configuration |
| `LateFeeRecord(id)` | Persistent | `LateFeeRecord` | Applied late fee record |
| `PaymentCount` | Instance | `u32` | Total payment counter |
| `RecurringPaymentCount` | Instance | `u32` | Recurring payment counter |
| `PlatformFeeCollector` | Instance | `Address` | Fee collector address |
| `RateLimitConfig` | Persistent | `RateLimitConfig` | Rate limit settings |
| `UserCallCount(user, fn)` | Persistent | `UserCallCount` | Per-user rate tracking |
| `BlockCallCount(block, fn)` | Temporary | `u32` | Per-block rate tracking |

### Data Structures

#### `PaymentRecord`

```rust
#[contracttype]
pub struct PaymentRecord {
    pub agreement_id: String,     // Associated agreement
    pub payment_number: u32,      // Sequential payment number
    pub amount: i128,             // Total payment amount
    pub landlord_amount: i128,    // Amount sent to landlord
    pub agent_amount: i128,       // Amount sent to agent (commission)
    pub timestamp: u64,           // Payment timestamp
    pub tenant: Address,          // Tenant who made the payment
}
```

#### `PaymentSplit`

```rust
#[contracttype]
pub struct PaymentSplit {
    pub landlord_amount: i128,    // Amount to landlord (90%)
    pub platform_amount: i128,    // Amount to platform (10%)
    pub token: Address,           // Token used for payment
    pub payment_date: u64,        // Payment timestamp
}
```

#### `RecurringPayment`

```rust
#[contracttype]
pub struct RecurringPayment {
    pub id: String,                   // Unique recurring payment ID
    pub agreement_id: String,         // Associated agreement
    pub payer: Address,               // Tenant (payer)
    pub payee: Address,               // Landlord (payee)
    pub amount: i128,                 // Payment amount
    pub frequency: PaymentFrequency,  // Payment frequency
    pub start_date: u64,              // Schedule start date
    pub end_date: u64,                // Schedule end date
    pub next_payment_date: u64,       // Next due date
    pub status: RecurringStatus,      // Current status
    pub auto_renew: bool,             // Auto-renew flag
}
```

#### `PaymentFrequency`

```rust
#[contracttype]
pub enum PaymentFrequency {
    Daily,      // Every 86,400 seconds
    Weekly,     // Every 604,800 seconds
    BiWeekly,   // Every 1,209,600 seconds
    Monthly,    // Every 2,592,000 seconds (30 days)
    Quarterly,  // Every 7,776,000 seconds (90 days)
    Annually,   // Every 31,536,000 seconds (365 days)
}
```

#### `RecurringStatus`

```rust
#[contracttype]
pub enum RecurringStatus {
    Active,     // Actively processing payments
    Paused,     // Temporarily paused
    Completed,  // Schedule completed
    Cancelled,  // Permanently cancelled
    Failed,     // Last execution failed
}
```

#### `PaymentExecution`

```rust
#[contracttype]
pub struct PaymentExecution {
    pub recurring_id: String,              // Associated recurring payment
    pub executed_at: u64,                  // Execution timestamp
    pub amount: i128,                      // Amount executed
    pub status: ExecutionStatus,           // Execution result
    pub transaction_hash: Option<String>,  // Optional tx hash
}
```

#### `ExecutionStatus`

```rust
#[contracttype]
pub enum ExecutionStatus {
    Success,    // Payment executed successfully
    Failed,     // Payment execution failed
    Pending,    // Payment pending execution
}
```

#### `LateFeeConfig`

```rust
#[contracttype]
pub struct LateFeeConfig {
    pub agreement_id: String,       // Associated agreement
    pub late_fee_percentage: u32,   // Fee percentage (e.g., 5 = 5%)
    pub grace_period_days: u32,     // Days before fee applies
    pub max_late_fee: i128,         // Maximum fee cap (0 = no cap)
    pub compounding: bool,          // Whether to compound daily
}
```

#### `LateFeeRecord`

```rust
#[contracttype]
pub struct LateFeeRecord {
    pub payment_id: String,          // Associated payment
    pub days_late: u32,              // Days past grace period
    pub base_amount: i128,           // Base rent amount
    pub late_fee: i128,              // Calculated late fee
    pub total_due: i128,             // Base + late fee
    pub calculated_at: u64,          // Calculation timestamp
    pub waived: bool,                // Whether fee was waived
    pub waive_reason: Option<String>, // Reason for waiver
}
```

#### `RentAgreement`

```rust
#[contracttype]
pub struct RentAgreement {
    pub agreement_id: String,
    pub landlord: Address,
    pub tenant: Address,
    pub agent: Option<Address>,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent_commission_rate: u32,  // Basis points (1 bp = 0.01%)
    pub status: AgreementStatus,
    pub total_rent_paid: i128,
    pub payment_count: u32,
    pub signed_at: Option<u64>,
    pub payment_token: Address,
    pub next_payment_due: u64,
    pub payment_history: Map<u32, PaymentSplit>,
}
```

---

## Events

### Recurring Payment Events

#### `RecurringPaymentCreated`

Emitted when a new recurring payment schedule is created.

```rust
#[contractevent(topics = ["recurring_payment_created"])]
pub struct RecurringPaymentCreated {
    pub recurring_id: String,
    pub agreement_id: String,
    pub amount: i128,
}
```

#### `RecurringPaymentExecuted`

Emitted when a recurring payment is successfully executed.

```rust
#[contractevent(topics = ["recurring_payment_executed"])]
pub struct RecurringPaymentExecuted {
    pub recurring_id: String,
    pub executed_at: u64,
}
```

#### `RecurringPaymentPaused`

Emitted when a recurring payment is paused.

```rust
#[contractevent(topics = ["recurring_payment_paused"])]
pub struct RecurringPaymentPaused {
    pub recurring_id: String,
}
```

#### `RecurringPaymentResumed`

Emitted when a paused recurring payment is resumed.

```rust
#[contractevent(topics = ["recurring_payment_resumed"])]
pub struct RecurringPaymentResumed {
    pub recurring_id: String,
}
```

#### `RecurringPaymentCancelled`

Emitted when a recurring payment is cancelled.

```rust
#[contractevent(topics = ["recurring_payment_cancelled"])]
pub struct RecurringPaymentCancelled {
    pub recurring_id: String,
}
```

#### `RecurringPaymentFailed`

Emitted when a recurring payment execution fails.

```rust
#[contractevent(topics = ["recurring_payment_failed"])]
pub struct RecurringPaymentFailed {
    pub recurring_id: String,
}
```

### Late Fee Events

#### `LateFeeConfigSet`

Emitted when a late fee configuration is created or updated.

```rust
#[contractevent(topics = ["late_fee_config_set"])]
pub struct LateFeeConfigSet {
    pub agreement_id: String,
    pub percentage: u32,
    pub grace_period: u32,
}
```

#### `LateFeeApplied`

Emitted when a late fee is applied to a payment.

```rust
#[contractevent(topics = ["late_fee_applied"])]
pub struct LateFeeApplied {
    pub payment_id: String,
    pub amount: i128,
    pub days_late: u32,
}
```

#### `LateFeeWaived`

Emitted when a late fee is waived by the landlord.

```rust
#[contractevent(topics = ["late_fee_waived"])]
pub struct LateFeeWaived {
    pub payment_id: String,
    pub reason: String,
}
```

### Listening for Events

```typescript
// Off-chain event listener example (JavaScript/Stellar SDK)
const events = await server.getEvents({
  startLedger: ledgerNumber,
  filters: [{
    type: "contract",
    contractIds: [paymentContractId],
    topics: [["recurring_payment_executed", "late_fee_applied"]]
  }]
});

for (const event of events.events) {
  console.log("Payment event:", event.topic, event.value);
}
```

---

## Error Codes

| Code | Name | Description |
|---|---|---|
| 5 | `InvalidAmount` | Amount is invalid |
| 10 | `AgreementNotActive` | Agreement is not in active status |
| 11 | `PaymentNotFound` | Payment record not found |
| 12 | `PaymentFailed` | Payment processing failed |
| 13 | `AgreementNotFound` | Agreement does not exist |
| 14 | `NotTenant` | Caller is not the tenant |
| 17 | `InvalidPaymentAmount` | Payment amount is invalid or doesn't match rent |
| 18 | `PaymentNotDue` | Payment is not yet due |
| 19 | `RecurringPaymentNotFound` | Recurring payment not found |
| 20 | `InvalidRecurringDates` | Start date >= end date |
| 21 | `RecurringPaymentNotActive` | Recurring payment not active |
| 22 | `RecurringPaymentNotPaused` | Recurring payment not paused |
| 23 | `RecurringPaymentAlreadyCancelled` | Already cancelled |
| 24 | `RecurringPaymentAlreadyCompleted` | Schedule completed |
| 25 | `RecurringPaymentExecutionFailed` | Execution failed on retry |
| 26 | `RecurringPaymentNotFailed` | Not in failed status |
| 27 | `RateLimitExceeded` | Rate limit exceeded |
| 28 | `CooldownNotMet` | Cooldown period not met |
| 29 | `LateFeeConfigNotFound` | No late fee config for agreement |
| 30 | `LateFeeRecordNotFound` | No late fee record for payment |
| 31 | `LateFeeAlreadyApplied` | Late fee already applied |
| 32 | `LateFeeAlreadyWaived` | Late fee already waived |
| 33 | `InvalidLateFeePercentage` | Percentage must be 1-100 |
| 34 | `PaymentNotLate` | Payment is within grace period |
| 35 | `NotLandlord` | Caller is not the landlord |

---

## Payment Workflow

### One-Time Rent Payment Flow

```
┌──────────┐    pay_rent     ┌──────────────────┐
│  Tenant   │───────────────▶│  Payment Contract │
│           │                │                   │
└──────────┘                └────────┬──────────┘
                                     │
                      ┌──────────────┼──────────────┐
                      │              │              │
                      ▼              ▼              ▼
               ┌───────────┐  ┌───────────┐  ┌───────────┐
               │  Landlord  │  │ Platform   │  │ Payment   │
               │  (90%)     │  │ (10%)      │  │ History   │
               └───────────┘  └───────────┘  └───────────┘
```

### Payment Processing Steps

1. **Tenant calls `pay_rent()`** with agreement ID and payment amount
2. **Validation:**
   - Agreement exists and is active
   - Caller is the tenant on the agreement
   - Amount matches the monthly rent exactly
   - Payment is due (current time >= `next_payment_due`)
   - Rate limit check passes
3. **Split Calculation:**
   - Landlord receives 90% of payment
   - Platform receives 10% of payment
4. **State Update (Effects):**
   - Payment split recorded in agreement's `payment_history`
   - `next_payment_due` advanced by 30 days
5. **Token Transfers (Interactions):**
   - Transfer 90% to landlord
   - Transfer 10% to platform fee collector

### Recurring Payment Flow

```
┌──────────────┐     create      ┌──────────────┐
│    Tenant     │───────────────▶│  Recurring    │
│               │                │  (Active)     │
└──────────────┘                └───────┬───────┘
                                        │
                           ┌────────────┼────────────┐
                           │            │            │
                     execute/process  pause      cancel
                           │            │            │
                           ▼            ▼            ▼
                    ┌───────────┐ ┌──────────┐ ┌───────────┐
                    │ Executed   │ │ Paused   │ │ Cancelled  │
                    └─────┬─────┘ └────┬─────┘ └───────────┘
                          │            │
                    next cycle     resume
                          │            │
                          ▼            ▼
                    ┌───────────┐ ┌──────────┐
                    │ Completed  │ │ Active   │
                    └───────────┘ └──────────┘
```

### Recurring Payment Lifecycle

1. **Creation:** Tenant creates recurring payment linked to an agreement
2. **Execution:** Payments execute when due (manually or via `process_due_payments`)
3. **Pause/Resume:** Tenant can temporarily pause and resume scheduling
4. **Auto-Renewal:** If enabled, schedule extends beyond `end_date`
5. **Completion:** Schedule completes when `end_date` passes without auto-renew
6. **Failure Handling:** Failed payments are tracked and can be retried

---

## Fee Handling

### Rent Payment Fee Split

The `pay_rent` function applies a **90/10 split**:

```
Payment Amount: 1,000 USDC
├── Landlord: 900 USDC (90%)
└── Platform: 100 USDC (10%)
```

### Agent Commission Split

The `pay_rent_with_agent` function supports agent commissions using basis points:

```
Payment Amount: 1,000 USDC (commission_rate = 500 = 5%)
├── Landlord: 950 USDC (95%)
└── Agent:     50 USDC (5%)
```

The commission rate is specified in **basis points** (1 basis point = 0.01%):

| Basis Points | Percentage | Agent Amount (per 1000) |
|---|---|---|
| 100 | 1% | 10 |
| 250 | 2.5% | 25 |
| 500 | 5% | 50 |
| 1000 | 10% | 100 |

### Late Fee Calculation

Late fees support two models:

#### Simple (Linear) Late Fee

```
late_fee = base_amount × (percentage / 100) × days_over_grace
```

Example: 1000 USDC rent, 5% fee, 3-day grace period, 5 days late:

```
days_over_grace = 5 - 3 = 2
late_fee = 1000 × (5 / 100) × 2 = 100 USDC
```

#### Compounding Daily Late Fee

```
late_fee = base_amount × ((1 + percentage/100)^days_over_grace) - base_amount
```

Example: 1000 USDC rent, 5% fee, 3-day grace period, 5 days late:

```
days_over_grace = 5 - 3 = 2
late_fee = 1000 × ((1.05)^2) - 1000 = 1000 × 1.1025 - 1000 = 102.5 USDC
```

#### Fee Cap

If `max_late_fee > 0`, the late fee is capped at that value regardless of the calculation result.

---

## Refunds

The Payment contract does not implement direct refund functions for completed payments. Refunds are handled through the **Escrow** contract's release mechanism.

### Refund Scenarios

| Scenario | Mechanism |
|---|---|
| **Overpayment** | Use Escrow contract's `release_escrow_partial` for partial refunds |
| **Early Termination** | Use Escrow contract's damage deduction to calculate and refund deposit |
| **Failed Recurring** | Mark as `Failed`, retry with `retry_failed_payment`, or cancel |
| **Waived Late Fee** | Use `waive_late_fee` to remove late fee from total due |

### Cancelling Recurring Payments

```rust
// Cancel recurring payment to stop future charges
client.cancel_recurring_payment(&String::from_str(&env, "1"));

// Verify cancellation
let recurring = client.get_recurring_payment(&String::from_str(&env, "1"));
assert_eq!(recurring.status, RecurringStatus::Cancelled);
```

---

## Usage Examples

### Complete Payment Flow

```rust
use soroban_sdk::{testutils::Address as _, Address, Env, String};

// Setup
let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(PaymentContract, ());
let client = PaymentContractClient::new(&env, &contract_id);

let landlord = Address::generate(&env);
let tenant = Address::generate(&env);
let platform = Address::generate(&env);
let token = Address::generate(&env);

// 1. Set platform fee collector
client.set_platform_fee_collector(&platform);

// 2. Process rent payment
client.pay_rent(
    &tenant,
    &String::from_str(&env, "AGR-001"),
    &1_000_000, // 1 USDC
);

// 3. Check payment split
let split = client.get_payment_split(
    &String::from_str(&env, "AGR-001"),
    &0, // First month
);
assert_eq!(split.landlord_amount, 900_000);  // 0.9 USDC
assert_eq!(split.platform_amount, 100_000);  // 0.1 USDC
```

### Complete Recurring Payment Flow

```rust
// 1. Create recurring payment
let recurring_id = client.create_recurring_payment(
    &String::from_str(&env, "AGR-001"),
    &1_000_000,
    &PaymentFrequency::Monthly,
    &1700000000,
    &1731536000,
    &true,
);

// 2. Execute a payment when due
client.execute_recurring_payment(&recurring_id);

// 3. Check execution history
let executions = client.get_payment_executions(&recurring_id);
assert_eq!(executions.len(), 1);
assert_eq!(executions.get(0).unwrap().status, ExecutionStatus::Success);

// 4. Pause and resume
client.pause_recurring_payment(&recurring_id);
client.resume_recurring_payment(&recurring_id);

// 5. Process all due payments (keeper-style)
let processed = client.process_due_payments();

// 6. Handle failed payments
let failed = client.get_failed_payments();
for i in 0..failed.len() {
    let failed_id = failed.get(i).unwrap();
    client.retry_failed_payment(&failed_id);
}
```

### Late Fee Management

```rust
// 1. Configure late fees
client.set_late_fee_config(
    &String::from_str(&env, "AGR-001"),
    &5,           // 5% late fee
    &3,           // 3-day grace period
    &500_000,     // Max 0.5 USDC
    &false,       // Simple (non-compounding)
);

// 2. Calculate late fee (read-only)
let fee = client.calculate_late_fee(
    &String::from_str(&env, "AGR-001"),
    &String::from_str(&env, "PAY-001"),
    &7, // 7 days late
);

// 3. Apply late fee (persists record)
let record = client.apply_late_fee(
    &String::from_str(&env, "AGR-001"),
    &String::from_str(&env, "PAY-001"),
);
assert_eq!(record.waived, false);

// 4. Waive late fee (landlord only)
client.waive_late_fee(
    &String::from_str(&env, "AGR-001"),
    &String::from_str(&env, "PAY-001"),
    &String::from_str(&env, "First-time late payment, waived as courtesy"),
);
```

### Error Handling

```rust
// Attempting to pay when not due
match client.try_pay_rent(&tenant, &agreement_id, &amount) {
    Ok(Ok(())) => { /* Payment successful */ }
    Ok(Err(PaymentError::PaymentNotDue)) => {
        // Payment not yet due
    }
    Ok(Err(PaymentError::AgreementNotActive)) => {
        // Agreement is not active
    }
    Ok(Err(PaymentError::NotTenant)) => {
        // Caller is not the tenant
    }
    Ok(Err(PaymentError::RateLimitExceeded)) => {
        // Too many calls, try again later
    }
    Err(e) => {
        // Invocation error
    }
    _ => {}
}
```

---

## Integration

### Integration with Escrow Contract

```rust
// Set up rental with escrow deposit + recurring payments
fn setup_rental_with_payments(
    env: &Env,
    escrow_contract: &Address,
    payment_contract: &Address,
    tenant: &Address,
    landlord: &Address,
    arbiter: &Address,
    deposit: i128,
    monthly_rent: i128,
    token: &Address,
    agreement_id: &String,
) -> Result<(), Error> {
    // 1. Create and fund security deposit escrow
    let escrow_client = EscrowContractClient::new(env, escrow_contract);
    let escrow_id = escrow_client.create(tenant, landlord, arbiter, &deposit, token)?;
    escrow_client.fund_escrow(&escrow_id, tenant)?;

    // 2. Set up recurring rent payments
    let payment_client = PaymentContractClient::new(env, payment_contract);
    payment_client.create_recurring_payment(
        agreement_id,
        &monthly_rent,
        &PaymentFrequency::Monthly,
        &env.ledger().timestamp(),
        &(env.ledger().timestamp() + 31_536_000), // 1 year
        &true,
    )?;

    // 3. Configure late fees
    payment_client.set_late_fee_config(
        agreement_id,
        &5,       // 5%
        &3,       // 3-day grace
        &0,       // No cap
        &false,   // Simple
    )?;

    Ok(())
}
```

### Integration with Property Registry

```rust
// Verify property before setting up recurring payments
fn setup_verified_rental_payments(
    env: &Env,
    registry_contract: &Address,
    payment_contract: &Address,
    property_id: &String,
    agreement_id: &String,
    monthly_rent: i128,
) -> Result<String, Error> {
    // Verify property is registered and verified
    let registry = PropertyRegistryContractClient::new(env, registry_contract);
    let property = registry
        .get_property(property_id)
        .ok_or(Error::PropertyNotFound)?;

    if !property.verified {
        return Err(Error::PropertyNotVerified);
    }

    // Create recurring payment for verified property
    let payment = PaymentContractClient::new(env, payment_contract);
    let recurring_id = payment.create_recurring_payment(
        agreement_id,
        &monthly_rent,
        &PaymentFrequency::Monthly,
        &env.ledger().timestamp(),
        &(env.ledger().timestamp() + 31_536_000),
        &true,
    )?;

    Ok(recurring_id)
}
```

### Keeper/Oracle Integration

```rust
// Off-chain keeper service that processes due payments
fn keeper_process_payments(
    env: &Env,
    payment_contract: &Address,
) -> Result<(), Error> {
    let client = PaymentContractClient::new(env, payment_contract);

    // 1. Get all due payments
    let due = client.get_due_payments()?;

    if due.is_empty() {
        return Ok(());
    }

    // 2. Process all due payments
    let processed = client.process_due_payments()?;

    // 3. Handle any failures
    let failed = client.get_failed_payments()?;
    for i in 0..failed.len() {
        let failed_id = failed.get(i).unwrap();
        // Retry or escalate
        let _ = client.retry_failed_payment(&failed_id);
    }

    Ok(())
}
```

### Integration Checklist

- [ ] Set platform fee collector address before processing payments
- [ ] Ensure agreements exist in storage before calling payment functions
- [ ] Configure late fee settings per agreement as needed
- [ ] Set up keeper/oracle for automatic `process_due_payments` execution
- [ ] Monitor failed payments and implement retry logic
- [ ] Listen for payment events for off-chain reconciliation
- [ ] Integrate with Escrow contract for security deposit management

---

## Related Documentation

- [Contract Architecture Overview](../architecture/DESIGN-PATTERNS.md) — Design patterns used across contracts
- [Escrow Contract](./ESCROW.md) — Security deposit escrow management
- [Property Registry Contract](./PROPERTY-REGISTRY.md) — Property registration and verification
- [Dispute Resolution Contract](../../contracts/dispute_resolution/README.md) — Formal dispute resolution
- [Stellar Integration Guide](../integration/STELLAR-INTEGRATION.md) — Stellar SDK integration
- [Emergency Procedures](../security/EMERGENCY-PROCEDURES.md) — Emergency pause and recovery
