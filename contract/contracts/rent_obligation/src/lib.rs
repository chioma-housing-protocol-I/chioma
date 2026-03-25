#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use errors::ObligationError;
pub use storage::DataKey;
pub use types::{BurnRecord, RentObligation};

#[contract]
pub struct TokenizedRentObligationContract;

#[contractimpl]
impl TokenizedRentObligationContract {
    fn validate_burn_reason(env: &Env, reason: &String) -> bool {
        reason == &String::from_str(env, "LeaseCompleted")
            || reason == &String::from_str(env, "AgreementTerminated")
            || reason == &String::from_str(env, "DisputeResolved")
            || reason == &String::from_str(env, "UserRequested")
    }

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

    /// Burn a tokenized rent obligation NFT.
    ///
    /// # Arguments
    /// * `token_id` - Agreement identifier for the NFT to burn
    /// * `reason` - Reason for burning the NFT
    ///
    /// # Errors
    /// * `NotInitialized` - If contract hasn't been initialized
    /// * `ObligationNotFound` - If the obligation doesn't exist
    /// * `AlreadyBurned` - If the NFT has already been burned
    /// * `Unauthorized` - If the caller is not the owner
    pub fn burn_nft(env: Env, token_id: String, reason: String) -> Result<(), ObligationError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::NotInitialized);
        }

        if reason.is_empty() || !Self::validate_burn_reason(&env, &reason) {
            return Err(ObligationError::InvalidBurnReason);
        }

        let obligation_key = DataKey::Obligation(token_id.clone());
        let owner_key = DataKey::Owner(token_id.clone());
        let burn_record_key = DataKey::BurnRecord(token_id.clone());

        if env.storage().persistent().has(&burn_record_key) {
            return Err(ObligationError::AlreadyBurned);
        }

        let obligation: RentObligation = env
            .storage()
            .persistent()
            .get(&obligation_key)
            .ok_or(ObligationError::ObligationNotFound)?;

        if env.ledger().timestamp() <= obligation.minted_at {
            return Err(ObligationError::CannotBurnActiveObligation);
        }

        obligation.owner.require_auth();

        let burn_record = BurnRecord {
            token_id: token_id.clone(),
            burned_by: obligation.owner.clone(),
            burned_at: env.ledger().timestamp(),
            reason,
        };

        env.storage()
            .persistent()
            .set(&burn_record_key, &burn_record);
        env.storage()
            .persistent()
            .extend_ttl(&burn_record_key, 500000, 500000);

        let burned_nfts_key = DataKey::BurnedNfts(obligation.owner.to_string());
        let mut burned_nfts: Vec<String> = env
            .storage()
            .persistent()
            .get(&burned_nfts_key)
            .unwrap_or_else(|| Vec::new(&env));
        burned_nfts.push_back(token_id.clone());
        env.storage()
            .persistent()
            .set(&burned_nfts_key, &burned_nfts);
        env.storage()
            .persistent()
            .extend_ttl(&burned_nfts_key, 500000, 500000);

        env.storage().persistent().remove(&obligation_key);
        env.storage().persistent().remove(&owner_key);

        let mut count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ObligationCount)
            .unwrap_or(0);
        count = count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::ObligationCount, &count);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::ObligationCount, 500000, 500000);

        events::nft_burned(&env, token_id, obligation.owner, burn_record.reason);

        Ok(())
    }

    /// Check if an NFT can be burned.
    ///
    /// # Arguments
    /// * `token_id` - Agreement identifier for the NFT
    ///
    /// # Errors
    /// * `NotInitialized` - If contract hasn't been initialized
    /// * `ObligationNotFound` - If the obligation doesn't exist
    /// * `AlreadyBurned` - If the NFT has already been burned
    pub fn can_burn(env: Env, token_id: String) -> Result<bool, ObligationError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::NotInitialized);
        }

        let obligation_key = DataKey::Obligation(token_id.clone());
        let burn_record_key = DataKey::BurnRecord(token_id.clone());

        if env.storage().persistent().has(&burn_record_key) {
            return Err(ObligationError::AlreadyBurned);
        }

        if !env.storage().persistent().has(&obligation_key) {
            return Err(ObligationError::ObligationNotFound);
        }

        let obligation: RentObligation = env
            .storage()
            .persistent()
            .get(&obligation_key)
            .ok_or(ObligationError::ObligationNotFound)?;

        if env.ledger().timestamp() <= obligation.minted_at {
            return Err(ObligationError::CannotBurnActiveObligation);
        }

        Ok(true)
    }

    /// Get the burn record for a burned NFT.
    ///
    /// # Arguments
    /// * `token_id` - Agreement identifier for the burned NFT
    ///
    /// # Errors
    /// * `BurnRecordNotFound` - If the NFT hasn't been burned
    pub fn get_burn_record(env: Env, token_id: String) -> Result<BurnRecord, ObligationError> {
        let burn_record_key = DataKey::BurnRecord(token_id);
        env.storage()
            .persistent()
            .get(&burn_record_key)
            .ok_or(ObligationError::BurnRecordNotFound)
    }

    /// Get all burned NFTs for an owner.
    ///
    /// # Arguments
    /// * `owner` - Address of the owner to query burned NFTs
    ///
    /// # Returns
    /// A vector of burned token IDs
    pub fn get_burned_nfts(env: Env, owner: Address) -> Result<Vec<String>, ObligationError> {
        if !env.storage().persistent().has(&DataKey::Initialized) {
            return Err(ObligationError::NotInitialized);
        }

        let owner_key = DataKey::BurnedNfts(owner.to_string());
        Ok(env
            .storage()
            .persistent()
            .get(&owner_key)
            .unwrap_or_else(|| Vec::new(&env)))
    }
}
