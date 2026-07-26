use soroban_sdk::{contractevent, Address, Bytes, Env, String};

use crate::types::{AppealOutcome, DisputeOutcome, DisputeStatus, Resolution, VoteResult};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub initialized_at: u64,
}

/// Event emitted when an arbiter is added to the registry
/// Topics: ["arbiter_added", arbiter: Address, admin: Address]
#[contractevent(topics = ["arbiter_added"])]
pub struct ArbiterAdded {
    #[topic]
    pub arbiter: Address,
    #[topic]
    pub admin: Address,
    pub added_at: u64,
}

/// Event emitted when a dispute is raised (simple voting flow)
/// Topics: ["dispute_raised", agreement_id: String]
#[contractevent(topics = ["dispute_raised"])]
pub struct DisputeRaised {
    #[topic]
    pub agreement_id: String,
    pub details_hash: Bytes,
    pub raised_at: u64,
}

/// Event emitted when an arbiter casts a vote on a dispute
/// Topics: ["vote_cast", agreement_id: String, arbiter: Address]
#[contractevent(topics = ["vote_cast"])]
pub struct VoteCast {
    #[topic]
    pub agreement_id: String,
    #[topic]
    pub arbiter: Address,
    pub favor_landlord: bool,
    pub voted_at: u64,
}

/// Event emitted when a dispute is resolved with simple majority
/// Topics: ["dispute_resolved", agreement_id: String]
#[contractevent(topics = ["dispute_resolved"])]
pub struct DisputeResolved {
    #[topic]
    pub agreement_id: String,
    pub result: VoteResult,
    pub voted_for_landlord_count: u32,
    pub voted_for_tenant_count: u32,
    pub resolved_at: u64,
}

/// Event emitted when a dispute times out
/// Topics: ["dispute_timeout", agreement_id: String]
#[contractevent(topics = ["dispute_timeout"])]
pub struct DisputeTimeout {
    #[topic]
    pub agreement_id: String,
    pub timed_out_at: u64,
}

/// Event emitted when dispute timeout configuration is updated
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

/// Event emitted when an arbiter's stats are updated (manual override)
/// Topics: ["arbiter_stats_set", arbiter: Address, admin: Address]
#[contractevent(topics = ["arbiter_stats_set"])]
pub struct ArbiterStatsSet {
    #[topic]
    pub arbiter: Address,
    #[topic]
    pub admin: Address,
    pub resolved_count: u32,
    pub average_score: u32,
    pub updated_at: u64,
}

/// Event emitted when an appeal is created
/// Topics: ["appeal_created", appeal_id: String, dispute_id: String]
#[contractevent(topics = ["appeal_created"])]
pub struct AppealCreated {
    #[topic]
    pub appeal_id: String,
    #[topic]
    pub dispute_id: String,
    pub appellant: Address,
    pub created_at: u64,
}

/// Event emitted when an appeal receives a vote
/// Topics: ["appeal_voted", appeal_id: String, arbiter: Address]
#[contractevent(topics = ["appeal_voted"])]
pub struct AppealVoted {
    #[topic]
    pub appeal_id: String,
    #[topic]
    pub arbiter: Address,
    pub voted_at: u64,
}

/// Event emitted when an appeal is resolved
/// Topics: ["appeal_resolved", appeal_id: String]
#[contractevent(topics = ["appeal_resolved"])]
pub struct AppealResolved {
    #[topic]
    pub appeal_id: String,
    pub outcome: AppealOutcome,
    pub resolved_at: u64,
}

/// Event emitted when an appeal is cancelled
/// Topics: ["appeal_cancelled", appeal_id: String]
#[contractevent(topics = ["appeal_cancelled"])]
pub struct AppealCancelled {
    #[topic]
    pub appeal_id: String,
    pub cancelled_at: u64,
}

/// Event emitted when a weighted vote is cast
/// Topics: ["weighted_vote_cast", dispute_id: String, arbiter: Address]
#[contractevent(topics = ["weighted_vote_cast"])]
pub struct WeightedVoteCast {
    #[topic]
    pub dispute_id: String,
    #[topic]
    pub arbiter: Address,
    pub weight: u64,
    pub voted_at: u64,
}

/// Event emitted when a weighted-voting dispute is resolved
/// Topics: ["dispute_resolved_by_weight", dispute_id: String]
#[contractevent(topics = ["dispute_resolved_by_weight"])]
pub struct DisputeResolvedByWeight {
    #[topic]
    pub dispute_id: String,
    pub outcome: DisputeOutcome,
    pub total_weight: u64,
    pub resolved_at: u64,
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

/// Helper function to emit contract initialized event
pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized {
        admin,
        initialized_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit arbiter added event
pub(crate) fn arbiter_added(env: &Env, admin: Address, arbiter: Address) {
    ArbiterAdded {
        arbiter,
        admin,
        added_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit dispute raised event
pub(crate) fn dispute_raised(env: &Env, agreement_id: String, details_hash: Bytes) {
    DisputeRaised {
        agreement_id,
        details_hash,
        raised_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit vote cast event
pub(crate) fn vote_cast(
    env: &Env,
    agreement_id: String,
    arbiter: Address,
    favor_landlord: bool,
) {
    VoteCast {
        agreement_id,
        arbiter,
        favor_landlord,
        voted_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit dispute resolved event
pub(crate) fn dispute_resolved(
    env: &Env,
    agreement_id: String,
    result: VoteResult,
    voted_for_landlord_count: u32,
    voted_for_tenant_count: u32,
) {
    DisputeResolved {
        agreement_id,
        result,
        voted_for_landlord_count,
        voted_for_tenant_count,
        resolved_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit dispute timeout event
pub(crate) fn dispute_timeout(env: &Env, agreement_id: String) {
    DisputeTimeout {
        agreement_id,
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

/// Helper function to emit arbiter stats set event
pub(crate) fn arbiter_stats_set(
    env: &Env,
    arbiter: Address,
    admin: Address,
    resolved_count: u32,
    average_score: u32,
) {
    ArbiterStatsSet {
        arbiter,
        admin,
        resolved_count,
        average_score,
        updated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit appeal created event
pub(crate) fn appeal_created(
    env: &Env,
    appeal_id: String,
    dispute_id: String,
    appellant: Address,
) {
    AppealCreated {
        appeal_id,
        dispute_id,
        appellant,
        created_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit appeal voted event
pub(crate) fn appeal_voted(env: &Env, appeal_id: String, arbiter: Address) {
    AppealVoted {
        appeal_id,
        arbiter,
        voted_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit appeal resolved event
pub(crate) fn appeal_resolved(
    env: &Env,
    appeal_id: String,
    outcome: AppealOutcome,
) {
    AppealResolved {
        appeal_id,
        outcome,
        resolved_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit appeal cancelled event
pub(crate) fn appeal_cancelled(env: &Env, appeal_id: String) {
    AppealCancelled {
        appeal_id,
        cancelled_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit weighted vote cast event
pub(crate) fn weighted_vote_cast(
    env: &Env,
    dispute_id: String,
    arbiter: Address,
    weight: u64,
) {
    WeightedVoteCast {
        dispute_id,
        arbiter,
        weight,
        voted_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit dispute resolved by weight event
pub(crate) fn dispute_resolved_by_weight(
    env: &Env,
    dispute_id: String,
    outcome: DisputeOutcome,
    total_weight: u64,
) {
    DisputeResolvedByWeight {
        dispute_id,
        outcome,
        total_weight,
        resolved_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit upgrade proposed event
pub(crate) fn upgrade_proposed(
    env: &Env,
    proposal_id: String,
    proposer: Address,
    eta: u64,
) {
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
