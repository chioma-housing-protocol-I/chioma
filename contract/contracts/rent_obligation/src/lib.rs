#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use errors::ObligationError;
pub use storage::DataKey;
pub use types::RentObligation;

#[contract]
pub struct TokenizedRentObligationContract;

#[contractimpl]
impl TokenizedRentObligationContract {
    /// Initialize the contract.
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env) -> Result<(), ObligationError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        env.storage()
            .persistent()
            .set(&DataKey::ObligationCount, &0u32);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::ObligationCount, 500000, 500000);

        Ok(())
    }

    /// Mint a new tokenized rent obligation NFT for a rent agreement.
    ///
    /// # Arguments
    /// * `agreement_id` - Unique identifier for the rent agreement
    /// * `landlord` - Address of the landlord who will receive the NFT
    ///
    /// # Errors
    /// * `NotInitialized` - If contract hasn't been initialized
    /// * `ObligationAlreadyExists` - If an obligation for this agreement already exists
    pub fn mint_obligation(
        env: Env,
        agreement_id: String,
        landlord: Address,
    ) -> Result<(), ObligationError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::NotInitialized);
        }

        landlord.require_auth();

        let obligation_key = DataKey::Obligation(agreement_id.clone());
        let owner_key = DataKey::Owner(agreement_id.clone());

        if env.storage().persistent().has(&obligation_key) {
            return Err(ObligationError::ObligationAlreadyExists);
        }

        let obligation = RentObligation {
            agreement_id: agreement_id.clone(),
            owner: landlord.clone(),
            minted_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&obligation_key, &obligation);
        env.storage()
            .persistent()
            .extend_ttl(&obligation_key, 500000, 500000);

        env.storage().persistent().set(&owner_key, &landlord);
        env.storage()
            .persistent()
            .extend_ttl(&owner_key, 500000, 500000);

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ObligationCount)
            .unwrap_or(0);
        count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::ObligationCount, &count);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::ObligationCount, 500000, 500000);

        events::obligation_minted(&env, agreement_id, landlord, obligation.minted_at);

        Ok(())
    }

    /// Transfer ownership of a tokenized rent obligation to another address.
    ///
    /// # Arguments
    /// * `from` - Current owner of the obligation
    /// * `to` - New owner to transfer to
    /// * `agreement_id` - Agreement identifier for the obligation
    ///
    /// # Errors
    /// * `NotInitialized` - If contract hasn't been initialized
    /// * `ObligationNotFound` - If the obligation doesn't exist
    /// * `Unauthorized` - If the caller is not the current owner
    pub fn transfer_obligation(
        env: Env,
        from: Address,
        to: Address,
        agreement_id: String,
    ) -> Result<(), ObligationError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::NotInitialized);
        }

        from.require_auth();

        let obligation_key = DataKey::Obligation(agreement_id.clone());
        let owner_key = DataKey::Owner(agreement_id.clone());

        let mut obligation: RentObligation = env
            .storage()
            .persistent()
            .get(&obligation_key)
            .ok_or(ObligationError::ObligationNotFound)?;

        if obligation.owner != from {
            return Err(ObligationError::Unauthorized);
        }

        obligation.owner = to.clone();

        env.storage().persistent().set(&obligation_key, &obligation);
        env.storage()
            .persistent()
            .extend_ttl(&obligation_key, 500000, 500000);

        env.storage().persistent().set(&owner_key, &to);
        env.storage()
            .persistent()
            .extend_ttl(&owner_key, 500000, 500000);

        events::obligation_transferred(&env, agreement_id, from, to);

        Ok(())
    }

    /// Get the current owner of a tokenized rent obligation.
    ///
    /// # Arguments
    /// * `agreement_id` - Agreement identifier for the obligation
    ///
    /// # Returns
    /// The address of the current owner, or None if the obligation doesn't exist
    pub fn get_obligation_owner(env: Env, agreement_id: String) -> Option<Address> {
        let owner_key = DataKey::Owner(agreement_id);
        env.storage().persistent().get(&owner_key)
    }

    /// Get the full obligation data for an agreement.
    ///
    /// # Arguments
    /// * `agreement_id` - Agreement identifier for the obligation
    ///
    /// # Returns
    /// The RentObligation data, or None if the obligation doesn't exist
    pub fn get_obligation(env: Env, agreement_id: String) -> Option<RentObligation> {
        let obligation_key = DataKey::Obligation(agreement_id);
        env.storage().persistent().get(&obligation_key)
    }

    /// Check if an obligation exists for a given agreement.
    ///
    /// # Arguments
    /// * `agreement_id` - Agreement identifier to check
    ///
    /// # Returns
    /// True if the obligation exists, false otherwise
    pub fn has_obligation(env: Env, agreement_id: String) -> bool {
        let obligation_key = DataKey::Obligation(agreement_id);
        env.storage().persistent().has(&obligation_key)
    }

    /// Get the total count of minted obligations.
    ///
    /// # Returns
    /// The total number of obligations that have been minted
    pub fn get_obligation_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ObligationCount)
            .unwrap_or(0)
    }
}
