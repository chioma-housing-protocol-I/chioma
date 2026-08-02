use soroban_sdk::{contractevent, Address, Env, String};

/// Event emitted when the contract is initialized
/// Topics: ["initialized", admin: Address]
#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
    pub initialized_at: u64,
}

/// Event emitted when an agent is registered
/// Topics: ["agent_registered", agent: Address]
#[contractevent(topics = ["agent_registered"])]
pub struct AgentRegistered {
    #[topic]
    pub agent: Address,
    pub external_profile_hash: String,
    pub registered_at: u64,
}

/// Event emitted when an agent is verified
/// Topics: ["agent_verified", admin: Address, agent: Address]
#[contractevent(topics = ["agent_verified"])]
pub struct AgentVerified {
    #[topic]
    pub admin: Address,
    #[topic]
    pub agent: Address,
    pub verified_at: u64,
}

/// Event emitted when an agent is rated
/// Topics: ["agent_rated", agent: Address, rater: Address]
#[contractevent(topics = ["agent_rated"])]
pub struct AgentRated {
    #[topic]
    pub agent: Address,
    #[topic]
    pub rater: Address,
    pub score: u32,
    pub transaction_id: String,
    pub rated_at: u64,
}

/// Event emitted when a transaction is registered
/// Topics: ["transaction_registered", transaction_id: String, agent: Address]
#[contractevent(topics = ["transaction_registered"])]
pub struct TransactionRegistered {
    #[topic]
    pub transaction_id: String,
    #[topic]
    pub agent: Address,
    pub registered_at: u64,
}

/// Event emitted when a transaction is marked completed
/// Topics: ["transaction_completed", transaction_id: String, agent: Address]
#[contractevent(topics = ["transaction_completed"])]
pub struct TransactionCompleted {
    #[topic]
    pub transaction_id: String,
    #[topic]
    pub agent: Address,
    pub completed_at: u64,
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

/// Helper function to emit agent registered event
pub(crate) fn agent_registered(env: &Env, agent: Address, external_profile_hash: String) {
    AgentRegistered {
        agent,
        external_profile_hash,
        registered_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit agent verified event
pub(crate) fn agent_verified(env: &Env, admin: Address, agent: Address) {
    AgentVerified {
        admin,
        agent,
        verified_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit agent rated event
pub(crate) fn agent_rated(
    env: &Env,
    agent: Address,
    rater: Address,
    score: u32,
    transaction_id: String,
) {
    AgentRated {
        agent,
        rater,
        score,
        transaction_id,
        rated_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit transaction registered event
pub(crate) fn transaction_registered(env: &Env, transaction_id: String, agent: Address) {
    TransactionRegistered {
        transaction_id,
        agent,
        registered_at: env.ledger().timestamp(),
    }
    .publish(env);
}

/// Helper function to emit transaction completed event
pub(crate) fn transaction_completed(env: &Env, transaction_id: String, agent: Address) {
    TransactionCompleted {
        transaction_id,
        agent,
        completed_at: env.ledger().timestamp(),
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
