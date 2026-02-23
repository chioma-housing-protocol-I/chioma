use soroban_sdk::{contractevent, Address, Env, String};

use crate::types::DisputeOutcome;

#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub min_votes_required: u32,
}

#[contractevent(topics = ["arbiter_added"])]
pub struct ArbiterAdded {
    #[topic]
    pub admin: Address,
    #[topic]
    pub arbiter: Address,
}

#[contractevent(topics = ["dispute_raised"])]
pub struct DisputeRaised {
    #[topic]
    pub agreement_id: String,
    pub details_hash: String,
}

#[contractevent(topics = ["vote_cast"])]
pub struct VoteCast {
    #[topic]
    pub agreement_id: String,
    #[topic]
    pub arbiter: Address,
    pub favor_landlord: bool,
}

#[contractevent(topics = ["dispute_resolved"])]
pub struct DisputeResolved {
    #[topic]
    pub agreement_id: String,
    pub outcome: DisputeOutcome,
    pub votes_favor_landlord: u32,
    pub votes_favor_tenant: u32,
}

pub(crate) fn contract_initialized(env: &Env, admin: Address, min_votes_required: u32) {
    ContractInitialized {
        admin,
        min_votes_required,
    }
    .publish(env);
}

pub(crate) fn arbiter_added(env: &Env, admin: Address, arbiter: Address) {
    ArbiterAdded { admin, arbiter }.publish(env);
}

pub(crate) fn dispute_raised(env: &Env, agreement_id: String, details_hash: String) {
    DisputeRaised {
        agreement_id,
        details_hash,
    }
    .publish(env);
}

pub(crate) fn vote_cast(env: &Env, agreement_id: String, arbiter: Address, favor_landlord: bool) {
    VoteCast {
        agreement_id,
        arbiter,
        favor_landlord,
    }
    .publish(env);
}

pub(crate) fn dispute_resolved(
    env: &Env,
    agreement_id: String,
    outcome: DisputeOutcome,
    votes_favor_landlord: u32,
    votes_favor_tenant: u32,
) {
    DisputeResolved {
        agreement_id,
        outcome,
        votes_favor_landlord,
        votes_favor_tenant,
    }
    .publish(env);
}
