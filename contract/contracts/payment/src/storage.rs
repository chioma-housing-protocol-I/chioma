//! Storage key definitions for the Payment contract.
use soroban_sdk::{contracttype, Env, IntoVal, String, Val};

/// Rent bump threshold/amount for persistent entity keys, in ledgers.
/// Matches the 500_000-ledger convention used across the other Chioma
/// contracts (roughly a month at ~5s/ledger). See #1683.
pub const TTL_THRESHOLD: u32 = 500_000;
pub const TTL_BUMP: u32 = 500_000;

/// Cap on a single recurring payment's execution history, so a long-lived
/// schedule (e.g. rent paid monthly for years) can't grow its
/// `PaymentExecutions` entry unbounded. See #1683.
pub const MAX_PAYMENT_EXECUTIONS: u32 = 120;

/// Extends a persistent key's TTL using the contract-wide convention.
/// Call this immediately after every `env.storage().persistent().set(...)`
/// on entity data so a record that stops receiving writes isn't silently
/// archived out from under an open position (#1683). Payment's storage
/// writes are spread across `lib.rs` and `payment_impl.rs` rather than
/// centralized, so this helper is the shared piece instead of a full
/// storage-module rewrite.
pub fn extend_persistent_ttl<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_BUMP);
}

/// Storage key variants for persistent storage.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Store payment by ID
    Payment(String),
    /// Store payment record by agreement ID and payment number
    PaymentRecord(String, u32),
    /// Counter for total payments
    PaymentCount,
    /// Platform fee collector address
    PlatformFeeCollector,
    /// Agreement storage (for reading agreement data)
    Agreement(String),
    /// Store recurring payment by ID
    RecurringPayment(String),
    /// Counter for recurring payments
    RecurringPaymentCount,
    /// Executions for recurring payment
    PaymentExecutions(String),
    /// List of failed recurring payment IDs
    FailedRecurringPayments,
    /// Rate limiting configuration
    RateLimitConfig,
    /// User call count for rate limiting
    UserCallCount(soroban_sdk::Address, String),
    /// Block call count for rate limiting
    BlockCallCount(u64, String),
    /// Late fee configuration per agreement
    LateFeeConfig(String),
    /// Late fee record per payment
    LateFeeRecord(String),
    /// Rent escalation configuration per agreement
    RentEscalationConfig(String),
    /// Upgrade proposal
    UpgradeProposal(String),
    /// Contract admin address, for pause/unpause (#1689)
    Admin,
    /// Whether the contract is globally paused (#1689)
    Paused,
}
