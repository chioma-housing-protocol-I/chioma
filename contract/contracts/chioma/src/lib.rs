#![no_std]
#![allow(clippy::too_many_arguments)]

//! Chioma rental agreement contract.
//!
//! @title Chioma
//! @notice On-chain rental agreement lifecycle: create, sign, submit, cancel, and query agreements.

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod agreement;
mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use agreement::{
    cancel_agreement, create_agreement, get_agreement, get_agreement_count, get_payment_split,
    has_agreement, sign_agreement, submit_agreement, validate_agreement_params,
};
pub use errors::RentalError;
pub use storage::DataKey;
pub use types::{AgreementStatus, Config, ContractState, PaymentSplit, RentAgreement};

/// Chioma rental agreement contract.
///
/// @title Contract
#[contract]
pub struct Contract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl Contract {
    /// Initialize the contract with an admin and configuration.
    ///
    /// @notice One-time setup: sets admin and config. Callable only once.
    /// @param env The Soroban environment.
    /// @param admin Address that will have admin privileges.
    /// @param config Initial configuration (e.g. fee_bps, paused).
    /// @return Ok(()) on success.
    /// @custom:error AlreadyInitialized If the contract has already been initialized.
    /// @custom:error InvalidConfig If config.fee_bps > 10000.
    pub fn initialize(env: Env, admin: Address, config: Config) -> Result<(), RentalError> {
        if env.storage().persistent().has(&DataKey::Initialized) {
            return Err(RentalError::AlreadyInitialized);
        }

        admin.require_auth();

        if config.fee_bps > 10_000 {
            return Err(RentalError::InvalidConfig);
        }

        env.storage().persistent().set(&DataKey::Initialized, &true);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Initialized, 500000, 500000);

        let state = ContractState {
            admin: admin.clone(),
            config: config.clone(),
            initialized: true,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin, config);

        Ok(())
    }

    /// Get the current state of the contract.
    ///
    /// @notice Returns admin, config, and initialized flag if the contract has been initialized.
    /// @param env The Soroban environment.
    /// @return The contract state if initialized, otherwise None.
    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    fn check_paused(env: &Env) -> Result<(), RentalError> {
        if let Some(state) = Self::get_state(env.clone()) {
            if state.config.paused {
                return Err(RentalError::ContractPaused);
            }
        }
        Ok(())
    }

    /// Update contract configuration.
    ///
    /// @notice Admin-only: updates fee and paused state. Emits config_updated event.
    /// @param env The Soroban environment.
    /// @param new_config New configuration (e.g. fee_bps, paused).
    /// @return Ok(()) on success.
    /// @custom:error InvalidState If contract state is missing.
    /// @custom:error InvalidConfig If new_config.fee_bps > 10000.
    pub fn update_config(env: Env, new_config: Config) -> Result<(), RentalError> {
        let mut state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;

        state.admin.require_auth();

        if new_config.fee_bps > 10_000 {
            return Err(RentalError::InvalidConfig);
        }

        let old_config = state.config.clone();
        state.config = new_config.clone();

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::config_updated(&env, state.admin, old_config, new_config);

        Ok(())
    }

    /// Create a new rental agreement.
    ///
    /// @notice Creates a draft agreement. Tenant must authorize. Reverts if contract is paused.
    /// @param env The Soroban environment.
    /// @param agreement_id Unique identifier for the agreement.
    /// @param landlord Address of the property owner.
    /// @param tenant Address of the renter (must authorize).
    /// @param agent Optional intermediary agent address.
    /// @param monthly_rent Rent amount per month.
    /// @param security_deposit Security deposit amount.
    /// @param start_date Lease start (Unix timestamp).
    /// @param end_date Lease end (Unix timestamp).
    /// @param agent_commission_rate Agent commission in basis points (0–100).
    /// @param payment_token Token address used for payments.
    /// @return Ok(()) on success.
    #[allow(clippy::too_many_arguments)]
    pub fn create_agreement(
        env: Env,
        agreement_id: String,
        landlord: Address,
        tenant: Address,
        agent: Option<Address>,
        monthly_rent: i128,
        security_deposit: i128,
        start_date: u64,
        end_date: u64,
        agent_commission_rate: u32,
        payment_token: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::create_agreement(
            &env,
            agreement_id,
            landlord,
            tenant,
            agent,
            monthly_rent,
            security_deposit,
            start_date,
            end_date,
            agent_commission_rate,
            payment_token,
        )
    }

    /// Sign an existing rental agreement.
    ///
    /// @notice Tenant signs a pending agreement, moving it to Active. Tenant must authorize.
    /// @param env The Soroban environment.
    /// @param tenant Address of the tenant signing (must authorize).
    /// @param agreement_id Identifier of the agreement to sign.
    /// @return Ok(()) on success.
    pub fn sign_agreement(
        env: Env,
        tenant: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::sign_agreement(&env, tenant, agreement_id)
    }

    /// Submit a draft agreement for tenant signature (Draft → Pending).
    ///
    /// @notice Landlord submits a draft so the tenant can sign. Landlord must authorize.
    /// @param env The Soroban environment.
    /// @param landlord Address of the landlord submitting (must authorize).
    /// @param agreement_id Identifier of the agreement to submit.
    /// @return Ok(()) on success.
    pub fn submit_agreement(
        env: Env,
        landlord: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::submit_agreement(&env, landlord, agreement_id)
    }

    /// Cancel an agreement while in Draft or Pending state.
    ///
    /// @notice Landlord cancels a draft or pending agreement. Caller must be landlord.
    /// @param env The Soroban environment.
    /// @param caller Address of the caller (must be the agreement landlord).
    /// @param agreement_id Identifier of the agreement to cancel.
    /// @return Ok(()) on success.
    pub fn cancel_agreement(
        env: Env,
        caller: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::cancel_agreement(&env, caller, agreement_id)
    }

    /// Retrieve details of a rental agreement.
    ///
    /// @notice Returns full agreement data (parties, amounts, dates, status) by ID.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return The agreement if found, otherwise None.
    pub fn get_agreement(env: Env, agreement_id: String) -> Option<RentAgreement> {
        agreement::get_agreement(&env, agreement_id)
    }

    /// Check if an agreement exists for a given ID.
    ///
    /// @notice Returns whether an agreement with the given ID is stored.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return True if the agreement exists, false otherwise.
    pub fn has_agreement(env: Env, agreement_id: String) -> bool {
        agreement::has_agreement(&env, agreement_id)
    }

    /// Get the total number of agreements created.
    ///
    /// @notice Returns the total count of agreements ever created (including cancelled).
    /// @param env The Soroban environment.
    /// @return The number of agreements.
    pub fn get_agreement_count(env: Env) -> u32 {
        agreement::get_agreement_count(&env)
    }

    /// Get the payment split details for a specific month of an agreement.
    ///
    /// @notice Returns landlord, tenant, and agent amounts for a given month from payment history.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @param month Month index to get the split for.
    /// @return PaymentSplit (landlord, tenant, agent amounts) or error if not found.
    pub fn get_payment_split(
        env: Env,
        agreement_id: String,
        month: u32,
    ) -> Result<PaymentSplit, RentalError> {
        agreement::get_payment_split(&env, agreement_id, month)
    }
}
