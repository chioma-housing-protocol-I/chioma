use soroban_sdk::{contractevent, Address, Env, String};

#[contractevent(topics = ["initialized"])]
pub struct ContractInitialized {
    #[topic]
    pub admin: Address,
}

#[contractevent(topics = ["agent_reg"])]
pub struct AgentRegistered {
    #[topic]
    pub agent: Address,
    pub external_profile_hash: String,
}

#[contractevent(topics = ["agent_ver"])]
pub struct AgentVerified {
    #[topic]
    pub admin: Address,
    #[topic]
    pub agent: Address,
}

#[contractevent(topics = ["agent_rated"])]
pub struct AgentRated {
    #[topic]
    pub agent: Address,
    #[topic]
    pub rater: Address,
    pub score: u32,
}

#[contractevent(topics = ["txn_reg"])]
pub struct TransactionRegistered {
    #[topic]
    pub transaction_id: String,
    #[topic]
    pub agent: Address,
}

pub(crate) fn contract_initialized(env: &Env, admin: Address) {
    ContractInitialized { admin }.publish(env);
}

pub(crate) fn agent_registered(env: &Env, agent: Address, external_profile_hash: String) {
    AgentRegistered {
        agent,
        external_profile_hash,
    }
    .publish(env);
}

pub(crate) fn agent_verified(env: &Env, admin: Address, agent: Address) {
    AgentVerified { admin, agent }.publish(env);
}

pub(crate) fn agent_rated(env: &Env, agent: Address, rater: Address, score: u32) {
    AgentRated {
        agent,
        rater,
        score,
    }
    .publish(env);
}

pub(crate) fn transaction_registered(env: &Env, transaction_id: String, agent: Address) {
    TransactionRegistered {
        transaction_id,
        agent,
    }
    .publish(env);
}
