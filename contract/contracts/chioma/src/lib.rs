#![no_std]
#![allow(clippy::too_many_arguments)]

use soroban_sdk::{contract, contractimpl, vec, Address, Env, String, Vec};

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
pub use events::{AgreementCreatedEvent, AgreementSigned, ConfigUpdated};
pub use storage::DataKey;
pub use types::{AgreementStatus, Config, ContractState, PaymentSplit, RentAgreement};

#[contract]
pub struct Contract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    /// Initialize the contract with an admin and configuration.
    ///
    /// # Arguments
    /// * `admin` - The address that will have admin privileges
    /// * `config` - Initial configuration parameters
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    /// * `InvalidConfig` - If the configuration parameters are invalid
    pub fn initialize(env: Env, admin: Address, config: Config) -> Result<(), RentalError> {
        if env.storage().instance().has(&DataKey::State) {
            return Err(RentalError::AlreadyInitialized);
        }

        admin.require_auth();

        if config.fee_bps > 10_000 {
            return Err(RentalError::InvalidConfig);
        }

        let state = ContractState {
            admin: admin.clone(),
            config,
            initialized: true,
        };

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        events::contract_initialized(&env, admin);

        Ok(())
    }

    pub fn get_state(env: Env) -> Option<ContractState> {
        env.storage().instance().get(&DataKey::State)
    }

    /// Update contract configuration.
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

        events::config_updated(&env, old_config, new_config);

        Ok(())
    }

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

    pub fn sign_agreement(
        env: Env,
        tenant: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        agreement::sign_agreement(&env, tenant, agreement_id)
    }

    pub fn get_agreement(env: Env, agreement_id: String) -> Option<RentAgreement> {
        agreement::get_agreement(&env, agreement_id)
    }

    pub fn has_agreement(env: Env, agreement_id: String) -> bool {
        agreement::has_agreement(&env, agreement_id)
    }

    pub fn get_agreement_count(env: Env) -> u32 {
        agreement::get_agreement_count(&env)
    }

    pub fn get_payment_split(
        env: Env,
        agreement_id: String,
        month: u32,
    ) -> Result<PaymentSplit, RentalError> {
        agreement::get_payment_split(&env, agreement_id, month)
    }
}
