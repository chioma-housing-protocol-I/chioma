#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod agent;
mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use agent::{
    complete_transaction, get_agent_count, get_agent_info, rate_agent, register_agent,
    register_transaction, verify_agent,
};
pub use errors::AgentError;
pub use storage::DataKey;
pub use types::{AgentInfo, AgentTransaction, ContractState};

#[contract]
pub struct AgentRegistryContract;

#[contractimpl]
impl AgentRegistryContract {
    /// Initialize the contract with an admin address.
    ///
    /// # Arguments
    /// * `admin` - The address that will have admin privileges to verify agents
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env, admin: Address) -> Result<(), AgentError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(AgentError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        let state = ContractState {
            admin: admin.clone(),
            initialized: true,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin);

        Ok(())
    }

    /// Get the current contract state.
    ///
    /// # Returns
    /// * `Option<ContractState>` - The contract state if initialized
    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    /// Register a new agent on-chain.
    ///
    /// # Arguments
    /// * `agent` - The address of the agent registering
    /// * `external_profile_hash` - Hash reference to agent's external profile (IPFS, etc.)
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `AgentAlreadyRegistered` - If the agent is already registered
    /// * `InvalidProfileHash` - If the profile hash is empty
    pub fn register_agent(
        env: Env,
        agent: Address,
        external_profile_hash: String,
    ) -> Result<(), AgentError> {
        agent::register_agent(&env, agent, external_profile_hash)
    }

    /// Verify a registered agent (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the verification
    /// * `agent` - The address of the agent to verify
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `AgentNotFound` - If the agent doesn't exist
    /// * `AlreadyVerified` - If the agent is already verified
    pub fn verify_agent(env: Env, admin: Address, agent: Address) -> Result<(), AgentError> {
        agent::verify_agent(&env, admin, agent)
    }

    /// Rate an agent after completing a transaction (1-5 stars).
    ///
    /// # Arguments
    /// * `rater` - The address of the person rating (tenant or landlord)
    /// * `agent` - The address of the agent being rated
    /// * `score` - The rating score (1-5)
    /// * `transaction_id` - The ID of the completed transaction
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `InvalidRatingScore` - If score is not between 1 and 5
    /// * `AgentNotFound` - If the agent doesn't exist
    /// * `AgentNotVerified` - If the agent is not verified
    /// * `TransactionNotFound` - If the transaction doesn't exist
    /// * `TransactionNotCompleted` - If the transaction is not marked as completed
    /// * `NotTransactionParty` - If the rater wasn't part of the transaction
    /// * `AlreadyRated` - If the rater has already rated this agent
    pub fn rate_agent(
        env: Env,
        rater: Address,
        agent: Address,
        score: u32,
        transaction_id: String,
    ) -> Result<(), AgentError> {
        agent::rate_agent(&env, rater, agent, score, transaction_id)
    }

    /// Get information about a registered agent.
    ///
    /// # Arguments
    /// * `agent` - The address of the agent
    ///
    /// # Returns
    /// * `Option<AgentInfo>` - The agent information if they exist
    pub fn get_agent_info(env: Env, agent: Address) -> Option<AgentInfo> {
        agent::get_agent_info(&env, agent)
    }

    /// Get the total count of registered agents.
    ///
    /// # Returns
    /// * `u32` - The total number of agents registered
    pub fn get_agent_count(env: Env) -> u32 {
        agent::get_agent_count(&env)
    }

    /// Register a transaction involving an agent.
    /// This is called when a rent agreement or property transaction is created.
    ///
    /// # Arguments
    /// * `transaction_id` - Unique identifier for the transaction
    /// * `agent` - The agent involved in the transaction
    /// * `parties` - Vector of addresses involved (tenant, landlord, etc.)
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `AgentNotFound` - If the agent doesn't exist
    pub fn register_transaction(
        env: Env,
        transaction_id: String,
        agent: Address,
        parties: Vec<Address>,
    ) -> Result<(), AgentError> {
        agent::register_transaction(&env, transaction_id, agent, parties)
    }

    /// Mark a transaction as completed.
    /// This enables the parties to rate the agent.
    ///
    /// # Arguments
    /// * `transaction_id` - The ID of the transaction to complete
    /// * `agent` - The agent address (for verification)
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `TransactionNotFound` - If the transaction doesn't exist
    /// * `Unauthorized` - If the caller is not the agent for this transaction
    pub fn complete_transaction(
        env: Env,
        transaction_id: String,
        agent: Address,
    ) -> Result<(), AgentError> {
        agent::complete_transaction(&env, transaction_id, agent)
    }
}
