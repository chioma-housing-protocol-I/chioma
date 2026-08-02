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
/// Topics: ["agreement_created", user: Address, admin: Address]
#[contractevent(topics = ["agreement_created"])]
pub struct AgreementCreated {
    #[topic]
    pub user: Address,
    #[topic]
    pub admin: Address,
    pub agreement_id: String,
    pub monthly_rent: i128,
    pub security_deposit: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub agent: Option<Address>,
}

/// Event emitted when an agreement is signed
/// Topics: ["agreement_signed", user: Address, admin: Address]
#[contractevent(topics = ["agreement_signed"])]
pub struct AgreementSigned {
    #[topic]
    pub user: Address,
    #[topic]
    pub admin: Address,
    pub agreement_id: String,
    pub signed_at: u64,
}

/// Event emitted when an agreement is submitted for signing
/// Topics: ["agreement_submitted", admin: Address, user: Address]
#[contractevent(topics = ["agreement_submitted"])]
pub struct AgreementSubmitted {
    #[topic]
    pub admin: Address,
    #[topic]
    pub user: Address,
    pub agreement_id: String,
}

/// Event emitted when an agreement is cancelled
/// Topics: ["agreement_cancelled", admin: Address, user: Address]
#[contractevent(topics = ["agreement_cancelled"])]
pub struct AgreementCancelled {
    #[topic]
    pub admin: Address,
    #[topic]
    pub user: Address,
    pub agreement_id: String,
}

/// Event emitted when an agreement is approved by a witness (PendingApproval → Active)
/// Topics: ["agreement_approved", approver: Address]
#[contractevent(topics = ["agreement_approved"])]
pub struct AgreementApproved {
    #[topic]
    pub approver: Address,
    pub agreement_id: String,
}

/// Event emitted when the contract configuration is updated
/// Topics: ["config_updated", admin: Address]
#[contractevent(topics = ["config_updated"])]
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

/// Event emitted when the contract is paused
/// Topics: ["paused", paused_by: Address]
#[contractevent(topics = ["paused"])]
pub struct Paused {
    #[topic]
    pub paused_by: Address,
    pub reason: String,
}

/// Event emitted when the contract is unpaused
/// Topics: ["unpaused", unpaused_by: Address]
#[contractevent(topics = ["unpaused"])]
pub struct Unpaused {
    #[topic]
    pub unpaused_by: Address,
}

// ─── Multi-Token Support Events ───────────────────────────────────────────────

/// Event emitted when a supported token is added
/// Topics: ["token_added", token: Address]
#[contractevent(topics = ["token_added"])]
pub struct TokenAdded {
    #[topic]
    pub token: Address,
    pub symbol: String,
}

/// Event emitted when a supported token is removed
/// Topics: ["token_removed", token: Address]
#[contractevent(topics = ["token_removed"])]
pub struct TokenRemoved {
    #[topic]
    pub token: Address,
}

/// Event emitted when an exchange rate between two tokens is updated
/// Topics: ["exchange_rate_updated", from_token: Address, to_token: Address]
#[contractevent(topics = ["exchange_rate_updated"])]
pub struct ExchangeRateUpdated {
    #[topic]
    pub from_token: Address,
    #[topic]
    pub to_token: Address,
    pub rate: i128,
}

/// Event emitted when a payment is made using a non-native token
/// Topics: ["payment_made_with_token", agreement_id: String, token: Address]
#[contractevent(topics = ["payment_made_with_token"])]
pub struct PaymentMadeWithToken {
    #[topic]
    pub agreement_id: String,
    #[topic]
    pub token: Address,
    pub amount: i128,
}

/// Event emitted when escrow funds are released using a non-native token
/// Topics: ["escrow_released_with_token", escrow_id: String, token: Address]
#[contractevent(topics = ["escrow_released_with_token"])]
pub struct EscrowReleasedWithToken {
    #[topic]
    pub escrow_id: String,
    #[topic]
    pub token: Address,
    pub amount: i128,
}

// ─── Deposit Interest Events ──────────────────────────────────────────────────

/// Event emitted when deposit interest configuration is set
/// Topics: ["interest_config_set", agreement_id: String]
#[contractevent(topics = ["interest_config_set"])]
pub struct InterestConfigSet {
    #[topic]
    pub agreement_id: String,
    pub annual_rate: u32,
}

/// Event emitted when interest is accrued on a deposit
/// Topics: ["interest_accrued", escrow_id: String]
#[contractevent(topics = ["interest_accrued"])]
pub struct InterestAccruedEvent {
    #[topic]
    pub escrow_id: String,
    pub amount: i128,
    pub total_accrued: i128,
}

/// Event emitted when accrued interest is distributed
/// Topics: ["interest_distributed", escrow_id: String]
#[contractevent(topics = ["interest_distributed"])]
pub struct InterestDistributed {
    #[topic]
    pub escrow_id: String,
    pub user_share: i128,
    pub admin_share: i128,
}

/// Event emitted when a contract operation results in an error
/// Topics: ["error_occurred"]
#[contractevent(topics = ["error_occurred"])]
pub struct ErrorOccurred {
    pub error_code: u32,
    pub operation: String,
    pub timestamp: u64,
}

// ─── Royalty Events ───────────────────────────────────────────────────────────

/// Event emitted when an NFT royalty is configured
/// Topics: ["royalty_set", token_id: String, recipient: Address]
#[contractevent(topics = ["royalty_set"])]
pub struct RoyaltySet {
    #[topic]
    pub token_id: String,
    #[topic]
    pub recipient: Address,
    pub percentage: u32,
}

/// Event emitted when a royalty payment is made
/// Topics: ["royalty_paid", token_id: String, recipient: Address]
#[contractevent(topics = ["royalty_paid"])]
pub struct RoyaltyPaid {
    #[topic]
    pub token_id: String,
    #[topic]
    pub recipient: Address,
    pub amount: i128,
}

// ─── Rate Limiting Events ─────────────────────────────────────────────────────

/// Event emitted when a rate limit is exceeded
/// Topics: ["rate_limit_exceeded", user: Address]
#[contractevent(topics = ["rate_limit_exceeded"])]
pub struct RateLimitExceeded {
    #[topic]
    pub user: Address,
    pub function_name: String,
    pub reason: crate::types::RateLimitReason,
    pub timestamp: u64,
}

/// Event emitted when rate limit configuration is updated
/// Topics: ["rate_limit_config_updated"]
#[contractevent(topics = ["rate_limit_config_updated"])]
pub struct RateLimitConfigUpdated {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}

// ─── Multi-Sig Events ─────────────────────────────────────────────────────────

/// Event emitted when the multi-sig system is initialized
/// Topics: ["multisig_initialized"]
#[contractevent(topics = ["multisig_initialized"])]
pub struct MultiSigInitialized {
    pub admins: u32,
    pub required_signatures: u32,
}

/// Event emitted when a multi-sig action is proposed
/// Topics: ["action_proposed", proposal_id: String, proposer: Address]
#[contractevent(topics = ["action_proposed"])]
pub struct ActionProposed {
    #[topic]
    pub proposal_id: String,
    #[topic]
    pub proposer: Address,
    pub action_type: crate::types::ActionType,
}

/// Event emitted when a multi-sig action is approved by a signer
/// Topics: ["action_approved", proposal_id: String, approver: Address]
#[contractevent(topics = ["action_approved"])]
pub struct ActionApproved {
    #[topic]
    pub proposal_id: String,
    #[topic]
    pub approver: Address,
    pub approval_count: u32,
}

/// Event emitted when a multi-sig action is executed
/// Topics: ["action_executed", proposal_id: String]
#[contractevent(topics = ["action_executed"])]
pub struct ActionExecuted {
    #[topic]
    pub proposal_id: String,
    pub action_type: crate::types::ActionType,
}

/// Event emitted when a multi-sig action is rejected
/// Topics: ["action_rejected", proposal_id: String]
#[contractevent(topics = ["action_rejected"])]
pub struct ActionRejected {
    #[topic]
    pub proposal_id: String,
}

/// Event emitted when a new admin is added to multi-sig
/// Topics: ["admin_added", admin: Address]
#[contractevent(topics = ["admin_added"])]
pub struct AdminAdded {
    #[topic]
    pub admin: Address,
    pub total_admins: u32,
}

/// Event emitted when an admin is removed from multi-sig
/// Topics: ["admin_removed", admin: Address]
#[contractevent(topics = ["admin_removed"])]
pub struct AdminRemoved {
    #[topic]
    pub admin: Address,
    pub total_admins: u32,
}

/// Event emitted when the required number of multi-sig signatures changes
/// Topics: ["signatures_updated"]
#[contractevent(topics = ["signatures_updated"])]
pub struct RequiredSignaturesUpdated {
    pub old_required: u32,
    pub new_required: u32,
}

// ─── Timelock Events ──────────────────────────────────────────────────────────

/// Event emitted when a timelocked action is queued
/// Topics: ["timelock_queued", action_id: String]
#[contractevent(topics = ["timelock_queued"])]
pub struct TimelockActionQueued {
    #[topic]
    pub action_id: String,
    pub eta: u64,
}

/// Event emitted when a timelocked action is executed
/// Topics: ["timelock_executed", action_id: String]
#[contractevent(topics = ["timelock_executed"])]
pub struct TimelockActionExecuted {
    #[topic]
    pub action_id: String,
}

/// Event emitted when a timelocked action is cancelled
/// Topics: ["timelock_cancelled", action_id: String]
#[contractevent(topics = ["timelock_cancelled"])]
pub struct TimelockActionCancelled {
    #[topic]
    pub action_id: String,
}

// ─── Versioning Events ────────────────────────────────────────────────────────

/// Event emitted when the contract version is updated
/// Topics: ["version_updated"]
#[contractevent(topics = ["version_updated"])]
pub struct VersionUpdated {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

// ─── Agreement Extension Events ─────────────────────────────────────────────

/// Event emitted when an agreement extension is proposed
/// Topics: ["extension_proposed", extension_id: String]
#[contractevent(topics = ["extension_proposed"])]
pub struct ExtensionProposed {
    #[topic]
    pub extension_id: String,
    pub agreement_id: String,
    pub new_end_date: u64,
}

/// Event emitted when an agreement extension is accepted by both parties
/// Topics: ["extension_accepted", extension_id: String]
#[contractevent(topics = ["extension_accepted"])]
pub struct ExtensionAccepted {
    #[topic]
    pub extension_id: String,
}

/// Event emitted when an agreement extension is rejected by a party
/// Topics: ["extension_rejected", extension_id: String]
#[contractevent(topics = ["extension_rejected"])]
pub struct ExtensionRejected {
    #[topic]
    pub extension_id: String,
    pub reason: String,
}

/// Event emitted when an agreement extension is activated (applied to agreement)
/// Topics: ["extension_activated", extension_id: String]
#[contractevent(topics = ["extension_activated"])]
pub struct ExtensionActivated {
    #[topic]
    pub extension_id: String,
}

/// Event emitted when an agreement extension is cancelled before activation
/// Topics: ["extension_cancelled", extension_id: String]
#[contractevent(topics = ["extension_cancelled"])]
pub struct ExtensionCancelled {
    #[topic]
    pub extension_id: String,
    pub reason: String,
}

// ─── Contract Upgrade Events ────────────────────────────────────────────────

/// Event emitted when a contract upgrade is proposed
/// Topics: ["upgrade_proposed", proposal_id: String]
#[contractevent(topics = ["upgrade_proposed"])]
pub struct UpgradeProposed {
    #[topic]
    pub proposal_id: String,
    pub eta: u64,
}

/// Event emitted when a contract upgrade receives approval
/// Topics: ["upgrade_approved", proposal_id: String]
#[contractevent(topics = ["upgrade_approved"])]
pub struct UpgradeApproved {
    #[topic]
    pub proposal_id: String,
    pub approvals: u32,
}

/// Event emitted when a contract upgrade is successfully executed
/// Topics: ["upgrade_executed", proposal_id: String]
#[contractevent(topics = ["upgrade_executed"])]
pub struct UpgradeExecuted {
    #[topic]
    pub proposal_id: String,
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

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
    user: Address,
    admin: Address,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent: Option<Address>,
) {
    AgreementCreated {
        user,
        admin,
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
    user: Address,
    admin: Address,
    signed_at: u64,
) {
    AgreementSigned {
        user,
        admin,
        agreement_id,
        signed_at,
    }
    .publish(env);
}

/// Helper function to emit agreement submitted event
pub(crate) fn agreement_submitted(env: &Env, agreement_id: String, admin: Address, user: Address) {
    AgreementSubmitted {
        admin,
        user,
        agreement_id,
    }
    .publish(env);
}

/// Helper function to emit agreement cancelled event
pub(crate) fn agreement_cancelled(env: &Env, agreement_id: String, admin: Address, user: Address) {
    AgreementCancelled {
        admin,
        user,
        agreement_id,
    }
    .publish(env);
}

/// Helper function to emit agreement approved (witness) event
pub(crate) fn agreement_approved(env: &Env, agreement_id: String, approver: Address) {
    AgreementApproved {
        approver,
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

/// Helper function to emit contract paused event
pub(crate) fn paused(env: &Env, reason: String, paused_by: Address) {
    Paused { paused_by, reason }.publish(env);
}

/// Helper function to emit contract unpaused event
pub(crate) fn unpaused(env: &Env, unpaused_by: Address) {
    Unpaused { unpaused_by }.publish(env);
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
    user_share: i128,
    admin_share: i128,
) {
    InterestDistributed {
        escrow_id,
        user_share,
        admin_share,
    }
    .publish(env);
}

pub(crate) fn error_occurred(env: &Env, error_code: u32, operation: String, timestamp: u64) {
    ErrorOccurred {
        error_code,
        operation,
        timestamp,
    }
    .publish(env);
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

pub(crate) fn multisig_initialized(env: &Env, admins: u32, required_signatures: u32) {
    MultiSigInitialized {
        admins,
        required_signatures,
    }
    .publish(env);
}

pub(crate) fn action_proposed(
    env: &Env,
    proposal_id: String,
    proposer: Address,
    action_type: crate::types::ActionType,
) {
    ActionProposed {
        proposal_id,
        proposer,
        action_type,
    }
    .publish(env);
}

pub(crate) fn action_approved(
    env: &Env,
    proposal_id: String,
    approver: Address,
    approval_count: u32,
) {
    ActionApproved {
        proposal_id,
        approver,
        approval_count,
    }
    .publish(env);
}

pub(crate) fn action_executed(
    env: &Env,
    proposal_id: String,
    action_type: crate::types::ActionType,
) {
    ActionExecuted {
        proposal_id,
        action_type,
    }
    .publish(env);
}

pub(crate) fn action_rejected(env: &Env, proposal_id: String) {
    ActionRejected { proposal_id }.publish(env);
}

pub(crate) fn admin_added(env: &Env, admin: Address, total_admins: u32) {
    AdminAdded {
        admin,
        total_admins,
    }
    .publish(env);
}

pub(crate) fn admin_removed(env: &Env, admin: Address, total_admins: u32) {
    AdminRemoved {
        admin,
        total_admins,
    }
    .publish(env);
}

pub(crate) fn required_signatures_updated(env: &Env, old_required: u32, new_required: u32) {
    RequiredSignaturesUpdated {
        old_required,
        new_required,
    }
    .publish(env);
}

pub(crate) fn timelock_action_queued(env: &Env, action_id: String, eta: u64) {
    TimelockActionQueued { action_id, eta }.publish(env);
}

pub(crate) fn timelock_action_executed(env: &Env, action_id: String) {
    TimelockActionExecuted { action_id }.publish(env);
}

pub(crate) fn timelock_action_cancelled(env: &Env, action_id: String) {
    TimelockActionCancelled { action_id }.publish(env);
}

pub(crate) fn version_updated(env: &Env, major: u32, minor: u32, patch: u32) {
    VersionUpdated {
        major,
        minor,
        patch,
    }
    .publish(env);
}

pub(crate) fn extension_proposed(
    env: &Env,
    extension_id: String,
    agreement_id: String,
    new_end_date: u64,
) {
    ExtensionProposed {
        extension_id,
        agreement_id,
        new_end_date,
    }
    .publish(env);
}

pub(crate) fn extension_accepted(env: &Env, extension_id: String) {
    ExtensionAccepted { extension_id }.publish(env);
}

pub(crate) fn extension_rejected(env: &Env, extension_id: String, reason: String) {
    ExtensionRejected {
        extension_id,
        reason,
    }
    .publish(env);
}

pub(crate) fn extension_activated(env: &Env, extension_id: String) {
    ExtensionActivated { extension_id }.publish(env);
}

pub(crate) fn extension_cancelled(env: &Env, extension_id: String, reason: String) {
    ExtensionCancelled {
        extension_id,
        reason,
    }
    .publish(env);
}

pub(crate) fn upgrade_proposed(env: &Env, proposal_id: String, eta: u64) {
    UpgradeProposed { proposal_id, eta }.publish(env);
}

pub(crate) fn upgrade_approved(env: &Env, proposal_id: String, approvals: u32) {
    UpgradeApproved {
        proposal_id,
        approvals,
    }
    .publish(env);
}

pub(crate) fn upgrade_executed(env: &Env, proposal_id: String) {
    UpgradeExecuted { proposal_id }.publish(env);
}
