#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{contract, contractimpl, Address, Env, String};

mod agreement;
mod errors;
mod events;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use agreement::{
    create_agreement, get_agreement, get_agreement_count, get_payment_split, has_agreement,
    sign_agreement, validate_agreement_params,
};
pub use errors::RentalError;
pub use storage::DataKey;
pub use types::{AgreementStatus, Config, ContractState, PaymentSplit, RentAgreement};

#[contract]
pub struct Contract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl Contract {
    /// Initialize the contract with an admin and configuration.
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `admin` - The address that will have admin privileges
    /// * `config` - Initial configuration parameters
    ///
    /// # Returns
    /// * `Result<(), RentalError>` - Ok if initialized, otherwise an error
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    /// * `InvalidConfig` - If the configuration parameters are invalid
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
    /// # Arguments
    /// * `env` - The environment
    ///
    /// # Returns
    /// * `Option<ContractState>` - The contract state if initialized, otherwise None
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
    /// # Arguments
    /// * `env` - The environment
    /// * `new_config` - The new configuration parameters
    ///
    /// # Returns
    /// * `Result<(), RentalError>` - Ok if updated, otherwise an error
    ///
    /// # Errors
    /// * `InvalidState` - If contract state is missing
    /// * `InvalidConfig` - If configuration values are invalid
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
    /// # Arguments
    /// * `env` - The environment
    /// * `agreement_id` - Unique identifier for the agreement
    /// * `landlord` - Address of the property owner
    /// * `tenant` - Address of the person renting the property
    /// * `agent` - Optional address of an intermediary agent
    /// * `monthly_rent` - The rent amount to be paid each month
    /// * `security_deposit` - The deposit amount held for security
    /// * `start_date` - Unix timestamp for the start of the lease
    /// * `end_date` - Unix timestamp for the end of the lease
    /// * `agent_commission_rate` - Commission rate for the agent in basis points
    /// * `payment_token` - The address of the token used for payments
    ///
    /// # Returns
    /// * `Result<(), RentalError>` - Ok if created, otherwise an error
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
    /// # Arguments
    /// * `env` - The environment
    /// * `tenant` - The address of the tenant signing
    /// * `agreement_id` - The identifier of the agreement to sign
    ///
    /// # Returns
    /// * `Result<(), RentalError>` - Ok if signed, otherwise an error
    pub fn sign_agreement(
        env: Env,
        tenant: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::sign_agreement(&env, tenant, agreement_id)
    }

    /// Retrieve details of a rental agreement.
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `agreement_id` - The identifier of the agreement
    ///
    /// # Returns
    /// * `Option<RentAgreement>` - The agreement details if found, otherwise None
    pub fn get_agreement(env: Env, agreement_id: String) -> Option<RentAgreement> {
        agreement::get_agreement(&env, agreement_id)
    }

    /// Check if an agreement exists for a given ID.
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `agreement_id` - The identifier of the agreement
    ///
    /// # Returns
    /// * `bool` - True if the agreement exists, False otherwise
    pub fn has_agreement(env: Env, agreement_id: String) -> bool {
        agreement::has_agreement(&env, agreement_id)
    }

    /// Get the total number of agreements created.
    ///
    /// # Arguments
    /// * `env` - The environment
    ///
    /// # Returns
    /// * `u32` - The count of agreements
    pub fn get_agreement_count(env: Env) -> u32 {
        agreement::get_agreement_count(&env)
    }

    /// Get the payment split details for a specific month of an agreement.
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `agreement_id` - The identifier of the agreement
    /// * `month` - The month number to calculate splitting for
    ///
    /// # Returns
    /// * `Result<PaymentSplit, RentalError>` - The split details if successful, otherwise an error
    pub fn get_payment_split(
        env: Env,
        agreement_id: String,
        month: u32,
    ) -> Result<PaymentSplit, RentalError> {
        agreement::get_payment_split(&env, agreement_id, month)
    }
}
