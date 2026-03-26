//! Storage key definitions for the Payment contract.
use soroban_sdk::{contracttype, String};

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
}
