//! Contract events for escrow lifecycle and timeout handling.
use soroban_sdk::{contractevent, Address, BytesN, Env};

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
