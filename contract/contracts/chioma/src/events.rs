use crate::Config;
use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

/// Event emitted when an agreement is created
/// Topics: ["agr_created", tenant: Address, landlord: Address]
#[contractevent(topics = ["agr_created"])]
pub struct AgreementCreated {
    #[topic]
    pub tenant: Address,
    #[topic]
    pub landlord: Address,
    pub agreement_id: String,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent: Option<Address>,
}

/// Event emitted when an agreement is signed
/// Topics: ["agr_signed", tenant: Address, landlord: Address]
#[contractevent(topics = ["agr_signed"])]
pub struct AgreementSigned {
    #[topic]
    pub tenant: Address,
    #[topic]
    pub landlord: Address,
    pub agreement_id: String,
    pub signed_at: u64,
}

/// Event emitted when an agreement is submitted for signing
/// Topics: ["agr_submit", landlord: Address, tenant: Address]
#[contractevent(topics = ["agr_submit"])]
pub struct AgreementSubmitted {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub tenant: Address,
    pub agreement_id: String,
}

/// Event emitted when an agreement is cancelled
/// Topics: ["agr_cancel", landlord: Address, tenant: Address]
#[contractevent(topics = ["agr_cancel"])]
pub struct AgreementCancelled {
    #[topic]
    pub landlord: Address,
    #[topic]
    pub tenant: Address,
    pub agreement_id: String,
}

/// Event emitted when the contract configuration is updated
/// Topics: ["cfg_updated", admin: Address]
#[contractevent(topics = ["cfg_updated"])]
pub struct ConfigUpdated {
    #[topic]
    pub admin: Address,
    pub old_fee_bps: u32,
    pub new_fee_bps: u32,
    pub old_fee_collector: Address,
    pub new_fee_collector: Address,
    pub old_paused: bool,
    pub new_paused: bool,
}

#[contractevent(topics = ["paused"])]
pub struct Paused {
    #[topic]
    pub paused_by: Address,
    pub reason: String,
}

#[contractevent(topics = ["unpaused"])]
pub struct Unpaused {
    #[topic]
    pub unpaused_by: Address,
}

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address, config: Config) {
    ContractInitialized {
        admin,
        fee_bps: config.fee_bps,
        fee_collector: config.fee_collector,
        paused: config.paused,
    }
    .publish(env);
}

/// Helper function to emit agreement created event
#[allow(clippy::too_many_arguments)]
pub(crate) fn agreement_created(
    env: &Env,
    agreement_id: String,
    tenant: Address,
    landlord: Address,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent: Option<Address>,
) {
    AgreementCreated {
        tenant,
        landlord,
        agreement_id,
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent,
    }
    .publish(env);
}

/// Helper function to emit agreement signed event
pub(crate) fn agreement_signed(
    env: &Env,
    agreement_id: String,
    tenant: Address,
    landlord: Address,
    signed_at: u64,
) {
    AgreementSigned {
        tenant,
        landlord,
        agreement_id,
        signed_at,
    }
    .publish(env);
}

/// Helper function to emit agreement submitted event
pub(crate) fn agreement_submitted(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
) {
    AgreementSubmitted {
        landlord,
        tenant,
        agreement_id,
    }
    .publish(env);
}

/// Helper function to emit agreement cancelled event
pub(crate) fn agreement_cancelled(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
) {
    AgreementCancelled {
        landlord,
        tenant,
        agreement_id,
    }
    .publish(env);
}

/// Helper function to emit config updated event
pub(crate) fn config_updated(env: &Env, admin: Address, old_config: Config, new_config: Config) {
    ConfigUpdated {
        admin,
        old_fee_bps: old_config.fee_bps,
        new_fee_bps: new_config.fee_bps,
        old_fee_collector: old_config.fee_collector,
        new_fee_collector: new_config.fee_collector,
        old_paused: old_config.paused,
        new_paused: new_config.paused,
    }
    .publish(env);
}

pub(crate) fn paused(env: &Env, reason: String, paused_by: Address) {
    Paused { paused_by, reason }.publish(env);
}

pub(crate) fn unpaused(env: &Env, unpaused_by: Address) {
    Unpaused { unpaused_by }.publish(env);
}

/// Events for multi-token support

#[contractevent]
pub struct TokenAdded {
    pub token: Address,
    pub symbol: String,
}

#[contractevent]
pub struct TokenRemoved {
    pub token: Address,
}

#[contractevent]
pub struct ExchangeRateUpdated {
    pub from_token: Address,
    pub to_token: Address,
    pub rate: i128,
}

#[contractevent]
pub struct PaymentMadeWithToken {
    pub agreement_id: String,
    pub token: Address,
    pub amount: i128,
}

#[contractevent]
pub struct EscrowReleasedWithToken {
    pub escrow_id: String,
    pub token: Address,
    pub amount: i128,
}

pub(crate) fn token_added(env: &Env, token: Address, symbol: String) {
    TokenAdded { token, symbol }.publish(env);
}

pub(crate) fn token_removed(env: &Env, token: Address) {
    TokenRemoved { token }.publish(env);
}

pub(crate) fn exchange_rate_updated(env: &Env, from_token: Address, to_token: Address, rate: i128) {
    ExchangeRateUpdated {
        from_token,
        to_token,
        rate,
    }
    .publish(env);
}

pub(crate) fn payment_made_with_token(
    env: &Env,
    agreement_id: String,
    token: Address,
    amount: i128,
) {
    PaymentMadeWithToken {
        agreement_id,
        token,
        amount,
    }
    .publish(env);
}

pub(crate) fn escrow_released_with_token(
    env: &Env,
    escrow_id: String,
    token: Address,
    amount: i128,
) {
    EscrowReleasedWithToken {
        escrow_id,
        token,
        amount,
    }
    .publish(env);
}

// ─── Deposit Interest Events ──────────────────────────────────────────────────

#[contractevent]
pub struct InterestConfigSet {
    pub agreement_id: String,
    pub annual_rate: u32,
}

#[contractevent]
pub struct InterestAccruedEvent {
    pub escrow_id: String,
    pub amount: i128,
    pub total_accrued: i128,
}

#[contractevent]
pub struct InterestDistributed {
    pub escrow_id: String,
    pub tenant_share: i128,
    pub landlord_share: i128,
}

pub(crate) fn interest_config_set(env: &Env, agreement_id: String, annual_rate: u32) {
    InterestConfigSet {
        agreement_id,
        annual_rate,
    }
    .publish(env);
}

pub(crate) fn interest_accrued(env: &Env, escrow_id: String, amount: i128, total_accrued: i128) {
    InterestAccruedEvent {
        escrow_id,
        amount,
        total_accrued,
    }
    .publish(env);
}

pub(crate) fn interest_distributed(
    env: &Env,
    escrow_id: String,
    tenant_share: i128,
    landlord_share: i128,
) {
    InterestDistributed {
        escrow_id,
        tenant_share,
        landlord_share,
    }
    .publish(env);
}

#[contractevent]
pub struct ErrorOccurred {
    pub error_code: u32,
    pub operation: String,
    pub timestamp: u64,
}

pub(crate) fn error_occurred(env: &Env, error_code: u32, operation: String, timestamp: u64) {
    ErrorOccurred {
        error_code,
        operation,
        timestamp,
    }
    .publish(env);
}

// ─── Royalty Events ───────────────────────────────────────────────────────────

#[contractevent]
pub struct RoyaltySet {
    pub token_id: String,
    pub percentage: u32,
    pub recipient: Address,
}

#[contractevent]
pub struct RoyaltyPaid {
    pub token_id: String,
    pub amount: i128,
    pub recipient: Address,
}

pub(crate) fn royalty_set(env: &Env, token_id: String, percentage: u32, recipient: Address) {
    RoyaltySet {
        token_id,
        percentage,
        recipient,
    }
    .publish(env);
}

pub(crate) fn royalty_paid(env: &Env, token_id: String, amount: i128, recipient: Address) {
    RoyaltyPaid {
        token_id,
        amount,
        recipient,
    }
    .publish(env);
}

// ─── Rate Limiting Events ─────────────────────────────────────────────────────

#[contractevent(topics = ["rate_limit"])]
pub struct RateLimitExceeded {
    #[topic]
    pub user: Address,
    pub function_name: String,
    pub reason: crate::types::RateLimitReason,
    pub timestamp: u64,
}

#[contractevent]
pub struct RateLimitConfigUpdated {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}

pub(crate) fn rate_limit_exceeded(
    env: &Env,
    user: Address,
    function_name: String,
    reason: crate::types::RateLimitReason,
) {
    RateLimitExceeded {
        user,
        function_name,
        reason,
        timestamp: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn rate_limit_config_updated(
    env: &Env,
    max_calls_per_block: u32,
    max_calls_per_user_per_day: u32,
    cooldown_blocks: u32,
) {
    RateLimitConfigUpdated {
        max_calls_per_block,
        max_calls_per_user_per_day,
        cooldown_blocks,
    }
    .publish(env);
}
