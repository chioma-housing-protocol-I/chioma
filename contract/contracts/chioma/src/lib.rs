#![no_std]
#![allow(clippy::too_many_arguments)]

//! Chioma rental agreement contract.
//!
//! @title Chioma
//! @notice On-chain rental agreement lifecycle: create, sign, submit, cancel, and query agreements.

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod agreement;
mod errors;
mod events;
mod multi_token;
mod storage;
mod types;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod tests_multi_token;

pub use agreement::{
    accept_extension, activate_extension, cancel_agreement, cancel_extension, create_agreement,
    create_agreement_with_token, get_agreement, get_agreement_count, get_agreement_token,
    get_current_agreement_end, get_extension, get_extension_history, get_payment_split,
    has_agreement, make_payment_with_token, propose_extension, reject_extension,
    release_escrow_with_token, sign_agreement, submit_agreement, validate_agreement_params,
};
pub use errors::RentalError;
pub use multi_token::{
    add_supported_token, convert_amount, get_exchange_rate, get_supported_tokens,
    is_token_supported, remove_supported_token, set_exchange_rate,
};
pub use storage::DataKey;
pub use types::{
    AgreementExtension, AgreementStatus, AgreementWithToken, Config, ContractState,
    ExtensionHistory, ExtensionStatus, PauseState, PaymentSplit, RentAgreement, SupportedToken,
    TokenExchangeRate,
};

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

        if config.paused {
            Self::set_pause_state(
                &env,
                admin.clone(),
                String::from_str(&env, "Initialized in paused mode"),
            );
        }

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

    fn set_pause_state(env: &Env, admin: Address, reason: String) -> PauseState {
        let pause_state = PauseState {
            is_paused: true,
            paused_at: env.ledger().timestamp(),
            paused_by: admin,
            pause_reason: reason,
        };

        env.storage()
            .instance()
            .set(&DataKey::PauseState, &pause_state);
        env.storage().instance().extend_ttl(500000, 500000);

        pause_state
    }

    fn check_paused(env: &Env) -> Result<(), RentalError> {
        if Self::is_paused(env.clone()) {
            return Err(RentalError::ContractPaused);
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

        let was_paused = Self::is_paused(env.clone());

        if new_config.fee_bps > 10_000 {
            return Err(RentalError::InvalidConfig);
        }

        let old_config = state.config.clone();
        state.config = new_config.clone();

        env.storage().instance().set(&DataKey::State, &state);
        env.storage().instance().extend_ttl(500000, 500000);

        if new_config.paused && !was_paused {
            let reason = String::from_str(&env, "Paused via config update");
            Self::set_pause_state(&env, state.admin.clone(), reason.clone());
            events::paused(&env, reason, state.admin.clone());
        } else if !new_config.paused && was_paused {
            env.storage().instance().remove(&DataKey::PauseState);
            events::unpaused(&env, state.admin.clone());
        }

        events::config_updated(&env, state.admin, old_config, new_config);

        Ok(())
    }

    pub fn pause(env: Env, reason: String) -> Result<(), RentalError> {
        let mut state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;

        state.admin.require_auth();

        if Self::is_paused(env.clone()) {
            return Err(RentalError::AlreadyPaused);
        }

        Self::set_pause_state(&env, state.admin.clone(), reason.clone());

        if !state.config.paused {
            state.config.paused = true;
            env.storage().instance().set(&DataKey::State, &state);
            env.storage().instance().extend_ttl(500000, 500000);
        }

        events::paused(&env, reason, state.admin);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), RentalError> {
        let mut state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;

        state.admin.require_auth();

        if !Self::is_paused(env.clone()) {
            return Err(RentalError::NotPaused);
        }

        env.storage().instance().remove(&DataKey::PauseState);

        if state.config.paused {
            state.config.paused = false;
            env.storage().instance().set(&DataKey::State, &state);
            env.storage().instance().extend_ttl(500000, 500000);
        }

        events::unpaused(&env, state.admin);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        if let Some(pause_state) = env
            .storage()
            .instance()
            .get::<DataKey, PauseState>(&DataKey::PauseState)
        {
            return pause_state.is_paused;
        }

        if let Some(state) = Self::get_state(env) {
            return state.config.paused;
        }

        false
    }

    // --- Token Management Functions ---

    pub fn add_supported_token(
        env: Env,
        token_address: Address,
        symbol: String,
        decimals: u32,
        min_amount: i128,
        max_amount: i128,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        // Only admin can add tokens
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_token::add_supported_token(
            env,
            token_address,
            symbol,
            decimals,
            min_amount,
            max_amount,
        )
    }

    pub fn remove_supported_token(env: Env, token_address: Address) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_token::remove_supported_token(env, token_address)
    }

    pub fn get_supported_tokens(env: Env) -> Result<Vec<SupportedToken>, RentalError> {
        multi_token::get_supported_tokens(env)
    }

    pub fn is_token_supported(env: Env, token_address: Address) -> Result<bool, RentalError> {
        multi_token::is_token_supported(env, token_address)
    }

    // --- Exchange Rate Functions ---

    pub fn set_exchange_rate(
        env: Env,
        from_token: Address,
        to_token: Address,
        rate: i128,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_token::set_exchange_rate(env, from_token, to_token, rate)
    }

    pub fn get_exchange_rate(
        env: Env,
        from_token: Address,
        to_token: Address,
    ) -> Result<i128, RentalError> {
        multi_token::get_exchange_rate(env, from_token, to_token)
    }

    pub fn update_exchange_rates(
        env: Env,
        rates: Vec<(Address, Address, i128)>,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        for (from, to, rate) in rates.iter() {
            multi_token::set_exchange_rate(env.clone(), from, to, rate)?;
        }
        Ok(())
    }

    pub fn convert_amount(
        env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> Result<i128, RentalError> {
        multi_token::convert_amount(env, from_token, to_token, amount)
    }

    // --- Agreement Functions with Token ---

    pub fn create_agreement_with_token(
        env: Env,
        property_id: String,
        tenant: Address,
        landlord: Address,
        payment_token: Address,
        rent_amount: i128,
        deposit_amount: i128,
        lease_start: u64,
        lease_end: u64,
    ) -> Result<String, RentalError> {
        Self::check_paused(&env)?;
        agreement::create_agreement_with_token(
            &env,
            property_id,
            tenant,
            landlord,
            payment_token,
            rent_amount,
            deposit_amount,
            lease_start,
            lease_end,
        )
    }

    pub fn get_agreement_token(env: Env, agreement_id: String) -> Result<Address, RentalError> {
        agreement::get_agreement_token(&env, agreement_id)
    }

    // --- Payment Functions with Token ---

    pub fn make_payment_with_token(
        env: Env,
        agreement_id: String,
        amount: i128,
        token: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::make_payment_with_token(&env, agreement_id, amount, token)
    }

    pub fn release_escrow_with_token(
        env: Env,
        escrow_id: String,
        token: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::release_escrow_with_token(&env, escrow_id, token)
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

    /// Propose a new agreement extension.
    ///
    /// @notice Landlord proposes an extension for an active agreement.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement to extend.
    /// @param extension_months Number of months to extend by.
    /// @param new_rent Optional new monthly rent for the extension.
    /// @param new_deposit Optional new security deposit for the extension.
    /// @return The extension ID (same as agreement_id in this implementation).
    pub fn propose_extension(
        env: Env,
        agreement_id: String,
        extension_months: u32,
        new_rent: Option<i128>,
        new_deposit: Option<i128>,
    ) -> Result<String, RentalError> {
        Self::check_paused(&env)?;
        agreement::propose_extension(&env, agreement_id, extension_months, new_rent, new_deposit)
    }

    /// Accept an agreement extension.
    ///
    /// @notice Tenant accepts a proposed extension.
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @return Ok(()) on success.
    pub fn accept_extension(env: Env, extension_id: String) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::accept_extension(&env, extension_id)
    }

    /// Reject an agreement extension.
    ///
    /// @notice Tenant or landlord rejects a proposed extension.
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @param reason Reason for rejection.
    /// @return Ok(()) on success.
    pub fn reject_extension(
        env: Env,
        extension_id: String,
        reason: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::reject_extension(&env, extension_id, reason)
    }

    /// Activate an accepted extension.
    ///
    /// @notice Landlord activates an extension that has been accepted by the tenant.
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @return Ok(()) on success.
    pub fn activate_extension(env: Env, extension_id: String) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::activate_extension(&env, extension_id)
    }

    /// Cancel a proposed extension.
    ///
    /// @notice Landlord cancels their own proposed extension.
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @param reason Reason for cancellation.
    /// @return Ok(()) on success.
    pub fn cancel_extension(
        env: Env,
        extension_id: String,
        reason: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::cancel_extension(&env, extension_id, reason)
    }

    /// Retrieve details of an extension.
    ///
    /// @notice Returns full extension data by ID.
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @return The extension on success.
    pub fn get_extension(
        env: Env,
        extension_id: String,
    ) -> Result<AgreementExtension, RentalError> {
        agreement::get_extension(&env, extension_id)
    }

    /// Get extension history for an agreement.
    ///
    /// @notice Returns all historical extensions for a given agreement.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return ExtensionHistory on success.
    pub fn get_extension_history(
        env: Env,
        agreement_id: String,
    ) -> Result<ExtensionHistory, RentalError> {
        agreement::get_extension_history(&env, agreement_id)
    }

    /// Get current end date for an agreement.
    ///
    /// @notice Returns the current end date from the agreement storage.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return The end date timestamp.
    pub fn get_current_agreement_end(env: Env, agreement_id: String) -> Result<u64, RentalError> {
        agreement::get_current_agreement_end(&env, agreement_id)
    }
}
