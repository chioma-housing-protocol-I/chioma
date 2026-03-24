#![no_std]
#![allow(clippy::too_many_arguments)]

//! Chioma rental agreement contract.
//!
//! @title Chioma
//! @notice On-chain rental agreement lifecycle: create, sign, submit, cancel, and query agreements.

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod agreement;
mod deposit_interest;
mod errors;
mod events;
mod multi_token;
mod royalties;
mod storage;
mod types;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod tests_multi_token;

#[cfg(test)]
mod tests_deposit_interest;

#[cfg(test)]
mod tests_errors;

#[cfg(test)]
mod tests_royalties;

pub use agreement::{
    cancel_agreement, create_agreement, create_agreement_with_token, get_agreement,
    get_agreement_count, get_agreement_token, get_payment_history, get_payment_split,
    has_agreement, make_payment_with_token, release_escrow_with_token, sign_agreement,
    submit_agreement, update_metadata, validate_agreement_params,
};
pub use errors::RentalError;
pub use multi_token::{
    add_supported_token, convert_amount, get_exchange_rate, get_supported_tokens,
    is_token_supported, remove_supported_token, set_exchange_rate,
};
pub use storage::DataKey;
pub use types::{
    AgreementInput, AgreementStatus, AgreementTerms, AgreementWithToken, Attribute,
    CompoundingFrequency, Config, ContractState, DepositInterest, DepositInterestConfig,
    ErrorContext, InterestAccrual, InterestRecipient, PauseState, PaymentSplit, RentAgreement,
    RoyaltyConfig, RoyaltyPayment, SupportedToken, TokenExchangeRate,
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
        input: crate::types::AgreementInput,
    ) -> Result<String, RentalError> {
        Self::check_paused(&env)?;
        agreement::create_agreement_with_token(&env, input)
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
        input: crate::types::AgreementInput,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::create_agreement(&env, input)
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

    /// Get all payments for an agreement.
    pub fn get_payment_history(env: Env, agreement_id: String) -> Vec<PaymentSplit> {
        agreement::get_payment_history(&env, agreement_id)
    }

    /// Update metadata for an agreement.
    pub fn update_metadata(
        env: Env,
        agreement_id: String,
        metadata_uri: String,
        attributes: Vec<Attribute>,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        agreement::update_metadata(&env, agreement_id, metadata_uri, attributes)
    }

    // ─── Deposit Interest Functions ───────────────────────────────────────────

    /// Set the interest configuration for a security deposit.
    ///
    /// Admin-only. Also initialises the DepositInterest record on first call.
    pub fn set_deposit_interest_config(
        env: Env,
        agreement_id: String,
        annual_rate: u32,
        compounding_frequency: CompoundingFrequency,
        interest_recipient: InterestRecipient,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();
        deposit_interest::set_deposit_interest_config(
            env,
            agreement_id,
            annual_rate,
            compounding_frequency,
            interest_recipient,
        )
    }

    /// Get the interest configuration for a security deposit.
    pub fn get_deposit_interest_config(
        env: Env,
        agreement_id: String,
    ) -> Result<DepositInterestConfig, RentalError> {
        deposit_interest::get_deposit_interest_config(env, agreement_id)
    }

    /// Calculate (but do not persist) the interest accrued so far.
    pub fn calculate_accrued_interest(env: Env, escrow_id: String) -> Result<i128, RentalError> {
        deposit_interest::calculate_accrued_interest(env, escrow_id)
    }

    /// Accrue interest up to the current ledger time and persist the update.
    pub fn accrue_interest(env: Env, escrow_id: String) -> Result<InterestAccrual, RentalError> {
        Self::check_paused(&env)?;
        deposit_interest::accrue_interest(env, escrow_id)
    }

    /// Get the full deposit-interest state.
    pub fn get_deposit_interest(
        env: Env,
        escrow_id: String,
    ) -> Result<DepositInterest, RentalError> {
        deposit_interest::get_deposit_interest(env, escrow_id)
    }

    /// Get the accrual history for a deposit.
    pub fn get_accrual_history(
        env: Env,
        escrow_id: String,
    ) -> Result<Vec<InterestAccrual>, RentalError> {
        deposit_interest::get_accrual_history(env, escrow_id)
    }

    /// Distribute all accrued interest to tenant / landlord per configuration.
    pub fn distribute_interest(env: Env, escrow_id: String) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        deposit_interest::distribute_interest(env, escrow_id)
    }

    /// (Keeper / oracle entry-point) Accrue interest for all deposits.
    pub fn process_interest_accruals(env: Env) -> Result<Vec<String>, RentalError> {
        Self::check_paused(&env)?;
        deposit_interest::process_interest_accruals(env)
    }

    /// Log an error context for diagnostics.
    pub fn log_error(
        env: Env,
        error: RentalError,
        operation: String,
        details: String,
    ) -> Result<(), RentalError> {
        errors::log_error(&env, error, operation, details)
    }

    /// Retrieve the most recent error logs.
    pub fn get_error_logs(env: Env, limit: u32) -> Result<Vec<ErrorContext>, RentalError> {
        errors::get_error_logs(&env, limit)
    }

    // ─── Royalty Functions ───────────────────────────────────────────────────

    /// Set the royalty configuration for a specific token (agreement).
    pub fn set_royalty(
        env: Env,
        token_id: String,
        royalty_percentage: u32,
        royalty_recipient: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        royalties::set_royalty(env, token_id, royalty_percentage, royalty_recipient)
    }

    /// Retrieve the royalty configuration for a token.
    pub fn get_royalty(env: Env, token_id: String) -> Result<RoyaltyConfig, RentalError> {
        royalties::get_royalty(env, token_id)
    }

    /// Calculate the royalty amount for a given sale price.
    pub fn calculate_royalty(
        env: Env,
        token_id: String,
        sale_price: i128,
    ) -> Result<i128, RentalError> {
        royalties::calculate_royalty(env, token_id, sale_price)
    }

    /// Perform a transfer of the "agreement" ownership with royalty payment.
    pub fn transfer_with_royalty(
        env: Env,
        token_id: String,
        to: Address,
        sale_price: i128,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env)?;
        royalties::transfer_with_royalty(env, token_id, to, sale_price)
    }

    /// Get the royalty payment history for a token.
    pub fn get_royalty_payments(
        env: Env,
        token_id: String,
    ) -> Result<Vec<RoyaltyPayment>, RentalError> {
        royalties::get_royalty_payments(env, token_id)
    }
}
