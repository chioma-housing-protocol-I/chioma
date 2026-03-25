//! Data structures for the Payment contract.
use soroban_sdk::{contracttype, Address, Map, String};

/// Payment record for tracking individual payments
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub agreement_id: String,
    pub payment_number: u32,
    pub amount: i128,
    pub landlord_amount: i128,
    pub agent_amount: i128,
    pub timestamp: u64,
    pub tenant: Address,
}

/// Payment split information for rent payments
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSplit {
    pub landlord_amount: i128,
    pub platform_amount: i128,
    pub token: Address,
    pub payment_date: u64,
}

/// Agreement status enum (needed for payment validation)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementStatus {
    Draft,
    Pending,
    Active,
    Completed,
    Cancelled,
    Terminated,
    Disputed,
}

/// Rent agreement structure (needed for payment processing)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentFrequency {
    Daily,
    Weekly,
    BiWeekly,
    Monthly,
    Quarterly,
    Annually,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecurringStatus {
    Active,
    Paused,
    Completed,
    Cancelled,
    Failed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentExecution {
    pub recurring_id: String,
    pub executed_at: u64,
    pub amount: i128,
    pub status: ExecutionStatus,
    pub transaction_hash: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ExecutionStatus {
    Success,
    Failed,
    Pending,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RecurringPaymentEvent {
    RecurringPaymentCreated {
        recurring_id: String,
        agreement_id: String,
        amount: i128,
    },
    RecurringPaymentExecuted {
        recurring_id: String,
        executed_at: u64,
    },
    RecurringPaymentPaused {
        recurring_id: String,
    },
    RecurringPaymentResumed {
        recurring_id: String,
    },
    RecurringPaymentCancelled {
        recurring_id: String,
    },
    RecurringPaymentFailed {
        recurring_id: String,
    },
}

// ─── Rate Limiting Types ──────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RateLimitConfig {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserCallCount {
    pub user: Address,
    pub call_count: u32,
    pub last_call_block: u64,
    pub daily_count: u32,
    pub daily_reset_block: u64,
}
