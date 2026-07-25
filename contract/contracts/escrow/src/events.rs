//! Contract events for escrow lifecycle and timeout handling.
use soroban_sdk::{contractevent, Address, BytesN, Env, String};

#[contractevent(topics = ["escrow_timeout"])]
pub struct EscrowTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
}

#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    #[topic]
    pub escrow_id: BytesN<32>,
}

#[contractevent(topics = ["partial_release"])]
pub struct PartialRelease {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub amount: i128,
    pub recipient: Address,
}

#[contractevent(topics = ["damage_deduction"])]
pub struct DamageDeduction {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub damage_amount: i128,
    pub refund_amount: i128,
}

#[contractevent(topics = ["escrow_frozen"])]
pub struct EscrowFrozen {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub frozen_by: Address,
    pub reason: String,
    pub timestamp: u64,
}

#[contractevent(topics = ["escrow_unfrozen"])]
pub struct EscrowUnfrozen {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub unfrozen_by: Address,
    pub timestamp: u64,
}

pub(crate) fn escrow_timeout(env: &Env, escrow_id: BytesN<32>) {
    EscrowTimeout { escrow_id }.publish(env);
}

pub(crate) fn dispute_timeout(env: &Env, escrow_id: BytesN<32>) {
    DisputeTimeout { escrow_id }.publish(env);
}

pub(crate) fn partial_release(env: &Env, escrow_id: BytesN<32>, amount: i128, recipient: Address) {
    PartialRelease {
        escrow_id,
        amount,
        recipient,
    }
    .publish(env);
}

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
    }
    .publish(env);
}

pub(crate) fn escrow_frozen(
    env: &Env,
    escrow_id: BytesN<32>,
    frozen_by: Address,
    reason: String,
    timestamp: u64,
) {
    EscrowFrozen {
        escrow_id,
        frozen_by,
        reason,
        timestamp,
    }
    .publish(env);
}

pub(crate) fn escrow_unfrozen(
    env: &Env,
    escrow_id: BytesN<32>,
    unfrozen_by: Address,
    timestamp: u64,
) {
    EscrowUnfrozen {
        escrow_id,
        unfrozen_by,
        timestamp,
    }
    .publish(env);
}

#[contractevent(topics = ["rent_released"])]
pub struct RentReleased {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub beneficiary_share: i128,
    pub governance_share: i128,
    pub agent_share: i128,
}

#[contractevent(topics = ["safety_deposit_withdrawn"])]
pub struct SafetyDepositWithdrawn {
    #[topic]
    pub escrow_id: BytesN<32>,
    pub amount: i128,
}

pub(crate) fn rent_released(
    env: &Env,
    escrow_id: BytesN<32>,
    beneficiary_share: i128,
    governance_share: i128,
    agent_share: i128,
) {
    RentReleased {
        escrow_id,
        beneficiary_share,
        governance_share,
        agent_share,
    }
    .publish(env);
}

pub(crate) fn safety_deposit_withdrawn(env: &Env, escrow_id: BytesN<32>, amount: i128) {
    SafetyDepositWithdrawn { escrow_id, amount }.publish(env);
}
