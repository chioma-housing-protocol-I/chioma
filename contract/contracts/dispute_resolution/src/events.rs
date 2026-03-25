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

#[contractevent(topics = ["appeal_created"])]
pub struct AppealCreated {
    #[topic]
    pub appeal_id: String,
    #[topic]
    pub dispute_id: String,
}

#[contractevent(topics = ["appeal_voted"])]
pub struct AppealVoted {
    #[topic]
    pub appeal_id: String,
    #[topic]
    pub arbiter: Address,
}

#[contractevent(topics = ["appeal_resolved"])]
pub struct AppealResolved {
    #[topic]
    pub appeal_id: String,
    pub outcome: DisputeOutcome,
}

#[contractevent(topics = ["appeal_cancelled"])]
pub struct AppealCancelled {
    #[topic]
    pub appeal_id: String,
}

#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    #[topic]
    pub agreement_id: String,
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

pub(crate) fn appeal_created(env: &Env, appeal_id: String, dispute_id: String) {
    AppealCreated {
        appeal_id,
        dispute_id,
    }
    .publish(env);
}

pub(crate) fn appeal_voted(env: &Env, appeal_id: String, arbiter: Address) {
    AppealVoted { appeal_id, arbiter }.publish(env);
}

pub(crate) fn appeal_resolved(env: &Env, appeal_id: String, outcome: DisputeOutcome) {
    AppealResolved { appeal_id, outcome }.publish(env);
}

pub(crate) fn appeal_cancelled(env: &Env, appeal_id: String) {
    AppealCancelled { appeal_id }.publish(env);
}

pub(crate) fn dispute_timeout(env: &Env, agreement_id: String) {
    DisputeTimeout { agreement_id }.publish(env);
}

// ── Weighted Voting Events ─────────────────────────────────────────────────

#[contractevent(topics = ["weighted_vote_cast"])]
pub struct WeightedVoteCast {
    #[topic]
    pub dispute_id: String,
    #[topic]
    pub arbiter: Address,
    pub weight: u32,
}

#[contractevent(topics = ["dispute_resolved_by_weight"])]
pub struct DisputeResolvedByWeight {
    #[topic]
    pub dispute_id: String,
    pub outcome: DisputeOutcome,
    pub total_weight: u32,
}

pub(crate) fn weighted_vote_cast(env: &Env, dispute_id: String, arbiter: Address, weight: u32) {
    WeightedVoteCast {
        dispute_id,
        arbiter,
        weight,
    }
    .publish(env);
}

pub(crate) fn dispute_resolved_by_weight(
    env: &Env,
    dispute_id: String,
    outcome: DisputeOutcome,
    total_weight: u32,
) {
    DisputeResolvedByWeight {
        dispute_id,
        outcome,
        total_weight,
    }
    .publish(env);
}
