#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod dispute;
mod errors;
mod events;
mod rate_limit;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use dispute::{
    add_arbiter, calculate_voting_weight, cancel_appeal, create_appeal, get_appeal, get_arbiter,
    get_arbiter_count, get_dispute, get_dispute_votes_weighted, get_timeout_config, get_vote,
    get_voting_weight, raise_dispute, resolve_appeal, resolve_dispute, resolve_dispute_on_timeout,
    resolve_dispute_weighted, set_arbiter_stats, set_timeout_config, vote_on_appeal,
    vote_on_dispute, vote_on_dispute_weighted,
};
pub use errors::DisputeError;
pub use storage::DataKey;
pub use types::{
    AppealStatus, AppealVote, Arbiter, ArbiterStats, ContractState, Dispute, DisputeAppeal,
    DisputeOutcome, TimeoutConfig, Vote, VotingWeight, WeightedDisputeVotes, WeightedVote,
};

#[contract]
pub struct DisputeResolutionContract;

#[contractimpl]
impl DisputeResolutionContract {
    /// Initialize the contract with an admin address and minimum votes required.
    ///
    /// # Arguments
    /// * `admin` - The address that will have admin privileges to add arbiters
    /// * `min_votes_required` - Minimum number of votes required to resolve a dispute (default: 3)
    /// * `chioma_contract` - Address of the chioma rental agreement contract
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(
        env: Env,
        admin: Address,
        min_votes_required: u32,
        chioma_contract: Address,
    ) -> Result<(), DisputeError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(DisputeError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        let state = ContractState {
            admin: admin.clone(),
            initialized: true,
            min_votes_required,
            chioma_contract,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin, min_votes_required);

        Ok(())
    }

    /// Get the current contract state.
    ///
    /// # Returns
    /// * `Option<ContractState>` - The contract state if initialized
    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    /// Add a verified arbiter to handle disputes (admin only).
    ///
    /// # Arguments
    /// * `admin` - The admin address performing the action
    /// * `arbiter` - The address of the arbiter to add
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `Unauthorized` - If the caller is not the admin
    /// * `ArbiterAlreadyExists` - If the arbiter is already registered
    pub fn add_arbiter(env: Env, admin: Address, arbiter: Address) -> Result<(), DisputeError> {
        dispute::add_arbiter(&env, admin, arbiter)
    }

    /// Raise a dispute for a specific agreement.
    ///
    /// # Arguments
    /// * `raiser` - The address raising the dispute (must be tenant or landlord)
    /// * `agreement_id` - Unique identifier for the agreement in dispute
    /// * `details_hash` - Hash reference to off-chain evidence/details (IPFS, etc.)
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `DisputeAlreadyExists` - If a dispute already exists for this agreement
    /// * `InvalidDetailsHash` - If the details hash is empty
    /// * `Unauthorized` - If raiser is not a party to the agreement
    pub fn raise_dispute(
        env: Env,
        raiser: Address,
        agreement_id: String,
        details_hash: String,
    ) -> Result<(), DisputeError> {
        dispute::raise_dispute(&env, raiser, agreement_id, details_hash)
    }

    /// Vote on an existing dispute (arbiters only).
    ///
    /// # Arguments
    /// * `arbiter` - The address of the arbiter voting
    /// * `agreement_id` - The ID of the agreement in dispute
    /// * `favor_landlord` - True to vote in favor of landlord, false for tenant
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `ArbiterNotFound` - If the arbiter doesn't exist or is inactive
    /// * `DisputeNotFound` - If the dispute doesn't exist
    /// * `DisputeAlreadyResolved` - If the dispute has already been resolved
    /// * `AlreadyVoted` - If this arbiter has already voted on this dispute
    pub fn vote_on_dispute(
        env: Env,
        arbiter: Address,
        agreement_id: String,
        favor_landlord: bool,
    ) -> Result<(), DisputeError> {
        dispute::vote_on_dispute(&env, arbiter, agreement_id, favor_landlord)
    }

    /// Resolve a dispute by evaluating votes and determining the outcome.
    ///
    /// # Arguments
    /// * `agreement_id` - The ID of the agreement in dispute
    ///
    /// # Returns
    /// * `DisputeOutcome` - The outcome of the dispute (FavorLandlord or FavorTenant)
    ///
    /// # Errors
    /// * `NotInitialized` - If the contract hasn't been initialized
    /// * `DisputeNotFound` - If the dispute doesn't exist
    /// * `DisputeAlreadyResolved` - If the dispute has already been resolved
    /// * `InsufficientVotes` - If minimum required votes haven't been cast
    pub fn resolve_dispute(env: Env, agreement_id: String) -> Result<DisputeOutcome, DisputeError> {
        dispute::resolve_dispute(&env, agreement_id)
    }

    pub fn resolve_dispute_on_timeout(
        env: Env,
        agreement_id: String,
    ) -> Result<DisputeOutcome, DisputeError> {
        dispute::resolve_dispute_on_timeout(&env, agreement_id)
    }

    /// Get information about a specific dispute.
    ///
    /// # Arguments
    /// * `agreement_id` - The ID of the agreement in dispute
    ///
    /// # Returns
    /// * `Option<Dispute>` - The dispute information if it exists
    pub fn get_dispute(env: Env, agreement_id: String) -> Option<Dispute> {
        dispute::get_dispute(&env, agreement_id)
    }

    /// Get information about a specific arbiter.
    ///
    /// # Arguments
    /// * `arbiter` - The address of the arbiter
    ///
    /// # Returns
    /// * `Option<Arbiter>` - The arbiter information if they exist
    pub fn get_arbiter(env: Env, arbiter: Address) -> Option<Arbiter> {
        dispute::get_arbiter(&env, arbiter)
    }

    /// Get the total count of registered arbiters.
    ///
    /// # Returns
    /// * `u32` - The total number of arbiters
    pub fn get_arbiter_count(env: Env) -> u32 {
        dispute::get_arbiter_count(&env)
    }

    /// Get a specific vote for a dispute.
    ///
    /// # Arguments
    /// * `agreement_id` - The ID of the agreement in dispute
    /// * `arbiter` - The address of the arbiter who voted
    ///
    /// # Returns
    /// * `Option<Vote>` - The vote information if it exists
    pub fn get_vote(env: Env, agreement_id: String, arbiter: Address) -> Option<Vote> {
        dispute::get_vote(&env, agreement_id, arbiter)
    }

    pub fn set_timeout_config(
        env: Env,
        admin: Address,
        config: TimeoutConfig,
    ) -> Result<(), DisputeError> {
        dispute::set_timeout_config(&env, admin, config)
    }

    pub fn get_timeout_config(env: Env) -> TimeoutConfig {
        dispute::get_timeout_config(&env)
    }

    pub fn create_appeal(
        env: Env,
        appellant: Address,
        dispute_id: String,
        reason: String,
    ) -> Result<String, DisputeError> {
        dispute::create_appeal(&env, appellant, dispute_id, reason)
    }

    pub fn vote_on_appeal(
        env: Env,
        arbiter: Address,
        appeal_id: String,
        vote: DisputeOutcome,
    ) -> Result<(), DisputeError> {
        dispute::vote_on_appeal(&env, arbiter, appeal_id, vote)
    }

    pub fn resolve_appeal(env: Env, appeal_id: String) -> Result<(), DisputeError> {
        dispute::resolve_appeal(&env, appeal_id)
    }

    pub fn cancel_appeal(
        env: Env,
        appellant: Address,
        appeal_id: String,
    ) -> Result<(), DisputeError> {
        dispute::cancel_appeal(&env, appellant, appeal_id)
    }

    pub fn get_appeal(env: Env, appeal_id: String) -> Option<DisputeAppeal> {
        dispute::get_appeal(&env, appeal_id)
    }

    // ── Weighted Voting ────────────────────────────────────────────────────

    /// Set rating (0-100) and disputes-resolved count for an arbiter (admin only).
    pub fn set_arbiter_stats(
        env: Env,
        admin: Address,
        arbiter: Address,
        rating: u32,
        disputes_resolved: u32,
    ) -> Result<(), DisputeError> {
        dispute::set_arbiter_stats(&env, admin, arbiter, rating, disputes_resolved)
    }

    /// Return the computed voting weight for an arbiter.
    pub fn get_voting_weight(env: Env, arbiter: Address) -> Result<VotingWeight, DisputeError> {
        dispute::get_voting_weight(&env, arbiter)
    }

    /// Cast a weighted vote on an open dispute.
    pub fn vote_on_dispute_weighted(
        env: Env,
        arbiter: Address,
        dispute_id: String,
        vote: DisputeOutcome,
    ) -> Result<(), DisputeError> {
        dispute::vote_on_dispute_weighted(&env, arbiter, dispute_id, vote)
    }

    /// Resolve a dispute by weighted vote totals (ties broken by first vote).
    pub fn resolve_dispute_weighted(
        env: Env,
        dispute_id: String,
    ) -> Result<DisputeOutcome, DisputeError> {
        dispute::resolve_dispute_weighted(&env, dispute_id)
    }

    /// Return all weighted votes for a dispute.
    pub fn get_dispute_votes_weighted(
        env: Env,
        dispute_id: String,
    ) -> Result<Vec<WeightedVote>, DisputeError> {
        dispute::get_dispute_votes_weighted(&env, dispute_id)
    }
}
