// Some event definitions describe operations that are not yet exposed by the
// contract's public API. They are kept here so the event schema stays in one
// place; remove the allow once the corresponding entrypoints emit them.
#![allow(dead_code)]

use soroban_sdk::{contractevent, Address, BytesN, Env, String};

use crate::types::EscrowStatus;

/// Event emitted when an escrow is created
/// Topics: ["escrow_created", escrow_id: BytesN<32>]
#[contractevent(topics = ["escrow_created"])]
pub struct EscrowCreated {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub depositor: Address,
    pub beneficiary: Address,
    pub arbiter: Address,
    pub platform_governance: Address,
    pub agent_referral: Address,
    pub amount: i128,
    pub token: Address,
    pub created_at: u64,
}

/// Event emitted when an escrow is funded
/// Topics: ["escrow_funded", escrow_id: BytesN<32>, funder: Address]
#[contractevent(topics = ["escrow_funded"])]
pub struct EscrowFunded {
    #[topic]
    pub escrow_id: BytesN<32>,
    #[topic]
    pub funder: Address,
    pub amount: i128,
    pub funded_at: u64,
}

/// Event emitted when a release is approved by a party
/// Topics: ["release_approved", escrow_id: BytesN<32>, approver: Address]
#[contractevent(topics = ["release_approved"])]
pub struct ReleaseApproved {
    #[topic]
    pub escrow_id: BytesN<32>,
    #[topic]
    pub approver: Address,
    pub approval_count: u32,
    pub approved_at: u64,
}

/// Event emitted when funds are released from escrow
/// Topics: ["escrow_released", escrow_id: BytesN<32>]
#[contractevent(topics = ["escrow_released"])]
pub struct EscrowReleased {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub landlord_amount: i128,
    pub tenant_amount: i128,
    pub platform_fee: i128,
    pub agent_fee: i128,
    pub released_at: u64,
}

/// Event emitted when an escrow times out
/// Topics: ["escrow_timeout", escrow_id: BytesN<32>]
#[contractevent(topics = ["escrow_timeout"])]
pub struct EscrowTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub timed_out_at: u64,
}

/// Event emitted when a partial release occurs
/// Topics: ["partial_release", escrow_id: BytesN<32>, recipient: Address]
#[contractevent(topics = ["partial_release"])]
pub struct PartialRelease {
    #[topic]
    pub escrow_id: BytesN<32>,
    #[topic]
    pub recipient: Address,
    pub amount: i128,
    pub released_at: u64,
}

/// Event emitted when damages are deducted
/// Topics: ["damage_deduction", escrow_id: BytesN<32>]
#[contractevent(topics = ["damage_deduction"])]
pub struct DamageDeduction {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub damage_amount: i128,
    pub refund_amount: i128,
    pub deducted_at: u64,
}

/// Event emitted when an escrow is frozen
/// Topics: ["escrow_frozen", escrow_id: BytesN<32>, caller: Address]
#[contractevent(topics = ["escrow_frozen"])]
pub struct EscrowFrozen {
    #[topic]
    pub escrow_id: BytesN<32>,
    #[topic]
    pub caller: Address,
    pub reason: String,
    pub frozen_at: u64,
}

/// Event emitted when an escrow is unfrozen
/// Topics: ["escrow_unfrozen", escrow_id: BytesN<32>, caller: Address]
#[contractevent(topics = ["escrow_unfrozen"])]
pub struct EscrowUnfrozen {
    #[topic]
    pub escrow_id: BytesN<32>,
    #[topic]
    pub caller: Address,
    pub unfrozen_at: u64,
}

/// Event emitted when rent is released from escrow
/// Topics: ["rent_released", escrow_id: BytesN<32>]
#[contractevent(topics = ["rent_released"])]
pub struct RentReleased {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub landlord_amount: i128,
    pub platform_fee: i128,
    pub agent_fee: i128,
    pub released_at: u64,
}

/// Event emitted when safety deposit is withdrawn
/// Topics: ["safety_deposit_withdrawn", escrow_id: BytesN<32>]
#[contractevent(topics = ["safety_deposit_withdrawn"])]
pub struct SafetyDepositWithdrawn {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub amount: i128,
    pub withdrawn_at: u64,
}

/// Event emitted when a dispute times out
/// Topics: ["dispute_timeout", escrow_id: BytesN<32>]
#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub timed_out_at: u64,
}

/// Event emitted when escrow timeout configuration is updated
/// Topics: ["timeout_config_updated", admin: Address]
#[contractevent(topics = ["timeout_config_updated"])]
pub struct TimeoutConfigUpdated {
    #[topic]
    pub admin: Address,
    pub escrow_timeout_days: u64,
    pub dispute_timeout_days: u64,
    pub payment_timeout_days: u64,
    pub updated_at: u64,
}

/// Event emitted when the admin is initialized
/// Topics: ["admin_initialized", admin: Address]
#[contractevent(topics = ["admin_initialized"])]
pub struct AdminInitialized {
    #[topic]
    pub admin: Address,
    pub initialized_at: u64,
}

/// Event emitted when the admin is updated
/// Topics: ["admin_updated", old_admin: Address, new_admin: Address]
#[contractevent(topics = ["admin_updated"])]
pub struct AdminUpdated {
    #[topic]
    pub old_admin: Address,
    #[topic]
    pub new_admin: Address,
    pub updated_at: u64,
}

/// Event emitted when the escrow status is updated
/// Topics: ["escrow_status_updated", escrow_id: BytesN<32>]
#[contractevent(topics = ["escrow_status_updated"])]
pub struct EscrowStatusUpdated {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub old_status: EscrowStatus,
    pub new_status: EscrowStatus,
}

/// Event emitted when a contract upgrade is proposed
/// Topics: ["upgrade_proposed", proposal_id: String]
#[contractevent(topics = ["upgrade_proposed"])]
pub struct UpgradeProposed {
    #[topic]
    pub proposal_id: String,
    pub proposer: Address,
    pub eta: u64,
    pub created_at: u64,
}

/// Event emitted when a contract upgrade proposal is approved
/// Topics: ["upgrade_approved", proposal_id: String]
#[contractevent(topics = ["upgrade_approved"])]
pub struct UpgradeApproved {
    #[topic]
    pub proposal_id: String,
    pub approver: Address,
    pub approval_count: u32,
}

/// Event emitted when a contract upgrade is executed
/// Topics: ["upgrade_executed", proposal_id: String]
#[contractevent(topics = ["upgrade_executed"])]
pub struct UpgradeExecuted {
    #[topic]
    pub proposal_id: String,
    pub executor: Address,
    pub executed_at: u64,
}

/// Helper function to emit escrow created event
pub(crate) fn escrow_created(
    env: &Env,
    escrow_id: BytesN<32>,
    depositor: Address,
    beneficiary: Address,
    arbiter: Address,
    platform_governance: Address,
    agent_referral: Address,
    amount: i128,
    token: Address,
) {
    EscrowCreated {
        escrow_id,
        depositor,
        beneficiary,
        arbiter,
        platform_governance,
        agent_referral,
        amount,
        token,
        created_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit escrow funded event
pub(crate) fn escrow_funded(env: &Env, escrow_id: BytesN<32>, funder: Address, amount: i128) {
    EscrowFunded {
        escrow_id,
        funder,
        amount,
        funded_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit release approved event
pub(crate) fn release_approved(
    env: &Env,
    escrow_id: BytesN<32>,
    approver: Address,
    approval_count: u32,
) {
    ReleaseApproved {
        escrow_id,
        approver,
        approval_count,
        approved_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit escrow released event
pub(crate) fn escrow_released(
    env: &Env,
    escrow_id: BytesN<32>,
    landlord_amount: i128,
    tenant_amount: i128,
    platform_fee: i128,
    agent_fee: i128,
) {
    EscrowReleased {
        escrow_id,
        landlord_amount,
        tenant_amount,
        platform_fee,
        agent_fee,
        released_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit escrow timeout event
pub(crate) fn escrow_timeout(env: &Env, escrow_id: BytesN<32>) {
    EscrowTimeout {
        escrow_id,
        timed_out_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit partial release event
pub(crate) fn partial_release(env: &Env, escrow_id: BytesN<32>, amount: i128, recipient: Address) {
    PartialRelease {
        escrow_id,
        recipient,
        amount,
        released_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit damage deduction event
pub(crate) fn damage_deduction(
    env: &Env,
    escrow_id: BytesN<32>,
    damage_amount: i128,
    refund_amount: i128,
) {
    DamageDeduction {
        escrow_id,
        damage_amount,
        refund_amount,
        deducted_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit escrow frozen event
pub(crate) fn escrow_frozen(
    env: &Env,
    escrow_id: BytesN<32>,
    caller: Address,
    reason: String,
    frozen_at: u64,
) {
    EscrowFrozen {
        escrow_id,
        caller,
        reason,
        frozen_at,
    }
    .publish(env);
}

/// Helper function to emit escrow unfrozen event
pub(crate) fn escrow_unfrozen(env: &Env, escrow_id: BytesN<32>, caller: Address, unfrozen_at: u64) {
    EscrowUnfrozen {
        escrow_id,
        caller,
        unfrozen_at,
    }
    .publish(env);
}

/// Helper function to emit rent released event
pub(crate) fn rent_released(
    env: &Env,
    escrow_id: BytesN<32>,
    landlord_amount: i128,
    platform_fee: i128,
    agent_fee: i128,
) {
    RentReleased {
        escrow_id,
        landlord_amount,
        platform_fee,
        agent_fee,
        released_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit safety deposit withdrawn event
pub(crate) fn safety_deposit_withdrawn(env: &Env, escrow_id: BytesN<32>, amount: i128) {
    SafetyDepositWithdrawn {
        escrow_id,
        amount,
        withdrawn_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit dispute timeout event
pub(crate) fn dispute_timeout(env: &Env, escrow_id: BytesN<32>) {
    DisputeTimeout {
        escrow_id,
        timed_out_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit timeout config updated event
pub(crate) fn timeout_config_updated(
    env: &Env,
    admin: Address,
    escrow_timeout_days: u64,
    dispute_timeout_days: u64,
    payment_timeout_days: u64,
) {
    TimeoutConfigUpdated {
        admin,
        escrow_timeout_days,
        dispute_timeout_days,
        payment_timeout_days,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit admin initialized event
pub(crate) fn admin_initialized(env: &Env, admin: Address) {
    AdminInitialized {
        admin,
        initialized_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit admin updated event
pub(crate) fn admin_updated(env: &Env, old_admin: Address, new_admin: Address) {
    AdminUpdated {
        old_admin,
        new_admin,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit escrow status updated event
pub(crate) fn escrow_status_updated(
    env: &Env,
    escrow_id: BytesN<32>,
    old_status: EscrowStatus,
    new_status: EscrowStatus,
) {
    EscrowStatusUpdated {
        escrow_id,
        old_status,
        new_status,
    }
    .publish(env);
}

/// Helper function to emit upgrade proposed event
pub(crate) fn upgrade_proposed(env: &Env, proposal_id: String, proposer: Address, eta: u64) {
    UpgradeProposed {
        proposal_id,
        proposer,
        eta,
        created_at: env.ledger().timestamp(),
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
