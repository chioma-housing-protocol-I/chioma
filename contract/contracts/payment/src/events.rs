use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when a recurring payment schedule is created
/// Topics: ["recurring_payment_created", agreement_id: String]
#[contractevent(topics = ["recurring_payment_created"])]
pub struct RecurringPaymentCreated {
    #[topic]
    pub agreement_id: String,
    pub recurring_id: String,
    pub amount: i128,
    pub created_at: u64,
}

/// Event emitted when a recurring payment is executed successfully
/// Topics: ["recurring_payment_executed", recurring_id: String]
#[contractevent(topics = ["recurring_payment_executed"])]
pub struct RecurringPaymentExecuted {
    #[topic]
    pub recurring_id: String,
    pub executed_at: u64,
}

/// Event emitted when a recurring payment is paused
/// Topics: ["recurring_payment_paused", recurring_id: String]
#[contractevent(topics = ["recurring_payment_paused"])]
pub struct RecurringPaymentPaused {
    #[topic]
    pub recurring_id: String,
    pub paused_at: u64,
}

/// Event emitted when a recurring payment is resumed
/// Topics: ["recurring_payment_resumed", recurring_id: String]
#[contractevent(topics = ["recurring_payment_resumed"])]
pub struct RecurringPaymentResumed {
    #[topic]
    pub recurring_id: String,
    pub resumed_at: u64,
}

/// Event emitted when a recurring payment is cancelled
/// Topics: ["recurring_payment_cancelled", recurring_id: String]
#[contractevent(topics = ["recurring_payment_cancelled"])]
pub struct RecurringPaymentCancelled {
    #[topic]
    pub recurring_id: String,
    pub cancelled_at: u64,
}

/// Event emitted when a recurring payment fails
/// Topics: ["recurring_payment_failed", recurring_id: String]
#[contractevent(topics = ["recurring_payment_failed"])]
pub struct RecurringPaymentFailed {
    #[topic]
    pub recurring_id: String,
    pub failed_at: u64,
}

/// Event emitted when a late fee is applied to a payment
/// Topics: ["late_fee_applied", payment_id: String]
#[contractevent(topics = ["late_fee_applied"])]
pub struct LateFeeApplied {
    #[topic]
    pub payment_id: String,
    pub late_fee: i128,
    pub days_over_grace: u32,
    pub applied_at: u64,
}

/// Event emitted when a late fee is waived
/// Topics: ["late_fee_waived", payment_id: String]
#[contractevent(topics = ["late_fee_waived"])]
pub struct LateFeeWaived {
    #[topic]
    pub payment_id: String,
    pub reason: String,
    pub waived_at: u64,
}

/// Event emitted when late fee configuration is set
/// Topics: ["late_fee_config_set", agreement_id: String]
#[contractevent(topics = ["late_fee_config_set"])]
pub struct LateFeeConfigSet {
    #[topic]
    pub agreement_id: String,
    pub late_fee_percentage: u32,
    pub grace_period_days: u32,
    pub set_at: u64,
}

/// Event emitted when rent escalation configuration is set
/// Topics: ["rent_escalation_config_set", agreement_id: String]
#[contractevent(topics = ["rent_escalation_config_set"])]
pub struct RentEscalationConfigSet {
    #[topic]
    pub agreement_id: String,
    pub annual_rate_bps: u32,
    pub set_at: u64,
}

/// Event emitted when a rent payment is processed
/// Topics: ["rent_paid", agreement_id: String, from: Address]
#[contractevent(topics = ["rent_paid"])]
pub struct RentPaid {
    #[topic]
    pub agreement_id: String,
    #[topic]
    pub from: Address,
    pub landlord: Address,
    pub token: Address,
    pub payment_amount: i128,
    pub landlord_amount: i128,
    pub platform_amount: i128,
    pub paid_at: u64,
}

/// Event emitted when platform fee collector is updated
/// Topics: ["platform_fee_collector_updated", collector: Address]
#[contractevent(topics = ["platform_fee_collector_updated"])]
pub struct PlatformFeeCollectorUpdated {
    #[topic]
    pub collector: Address,
    pub updated_at: u64,
}

/// Event emitted when a contract upgrade is proposed
/// Topics: ["upgrade_proposed", proposal_id: String, proposer: Address]
#[contractevent(topics = ["upgrade_proposed"])]
pub struct UpgradeProposed {
    #[topic]
    pub proposal_id: String,
    #[topic]
    pub proposer: Address,
    pub eta: u64,
    pub proposed_at: u64,
}

/// Event emitted when a contract upgrade is approved
/// Topics: ["upgrade_approved", proposal_id: String, approver: Address]
#[contractevent(topics = ["upgrade_approved"])]
pub struct UpgradeApproved {
    #[topic]
    pub proposal_id: String,
    #[topic]
    pub approver: Address,
    pub approval_count: u32,
    pub approved_at: u64,
}

/// Event emitted when a contract upgrade is executed
/// Topics: ["upgrade_executed", proposal_id: String, executor: Address]
#[contractevent(topics = ["upgrade_executed"])]
pub struct UpgradeExecuted {
    #[topic]
    pub proposal_id: String,
    #[topic]
    pub executor: Address,
    pub executed_at: u64,
}

pub(crate) fn recurring_payment_created(
    env: &Env,
    recurring_id: String,
    agreement_id: String,
    amount: i128,
) {
    RecurringPaymentCreated {
        agreement_id,
        recurring_id,
        amount,
        created_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn recurring_payment_executed(env: &Env, recurring_id: String, executed_at: u64) {
    RecurringPaymentExecuted {
        recurring_id,
        executed_at,
    }
    .publish(env);
}

pub(crate) fn recurring_payment_paused(env: &Env, recurring_id: String) {
    RecurringPaymentPaused {
        recurring_id,
        paused_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn recurring_payment_resumed(env: &Env, recurring_id: String) {
    RecurringPaymentResumed {
        recurring_id,
        resumed_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn recurring_payment_cancelled(env: &Env, recurring_id: String) {
    RecurringPaymentCancelled {
        recurring_id,
        cancelled_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn recurring_payment_failed(env: &Env, recurring_id: String) {
    RecurringPaymentFailed {
        recurring_id,
        failed_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn late_fee_applied(
    env: &Env,
    payment_id: String,
    late_fee: i128,
    days_over_grace: u32,
) {
    LateFeeApplied {
        payment_id,
        late_fee,
        days_over_grace,
        applied_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn late_fee_waived(env: &Env, payment_id: String, reason: String) {
    LateFeeWaived {
        payment_id,
        reason,
        waived_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn late_fee_config_set(
    env: &Env,
    agreement_id: String,
    late_fee_percentage: u32,
    grace_period_days: u32,
) {
    LateFeeConfigSet {
        agreement_id,
        late_fee_percentage,
        grace_period_days,
        set_at: env.ledger().timestamp(),
    }
    .publish(env);
}

pub(crate) fn rent_escalation_config_set(env: &Env, agreement_id: String, annual_rate_bps: u32) {
    RentEscalationConfigSet {
        agreement_id,
        annual_rate_bps,
        set_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit rent paid event
pub(crate) fn rent_paid(
    env: &Env,
    agreement_id: String,
    from: Address,
    landlord: Address,
    token: Address,
    payment_amount: i128,
    landlord_amount: i128,
    platform_amount: i128,
) {
    RentPaid {
        agreement_id,
        from,
        landlord,
        token,
        payment_amount,
        landlord_amount,
        platform_amount,
        paid_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit platform fee collector updated event
pub(crate) fn platform_fee_collector_updated(env: &Env, collector: Address) {
    PlatformFeeCollectorUpdated {
        collector,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade proposed event
pub(crate) fn upgrade_proposed(env: &Env, proposal_id: String, proposer: Address, eta: u64) {
    UpgradeProposed {
        proposal_id,
        proposer,
        eta,
        proposed_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade approved event
pub(crate) fn upgrade_approved(
    env: &Env,
    proposal_id: String,
    approver: Address,
    approval_count: u32,
) {
    UpgradeApproved {
        proposal_id,
        approver,
        approval_count,
        approved_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade executed event
pub(crate) fn upgrade_executed(env: &Env, proposal_id: String, executor: Address) {
    UpgradeExecuted {
        proposal_id,
        executor,
        executed_at: env.ledger().timestamp(),
    }
    .publish(env);
}
