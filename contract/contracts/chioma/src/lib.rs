#![no_std]
#![allow(clippy::too_many_arguments)]

//! Chioma rental agreement contract.
//!
//! @title Chioma
//! @notice On-chain rental agreement lifecycle: create, sign, submit, cancel, and query agreements.
//! Optimized for gas efficiency and security.

use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env, String, Symbol, Vec};

mod agreement;
mod deposit_interest;
mod errors;
mod events;
mod gas_optimization;
mod multi_sig;
mod multi_token;
mod rate_limit;
mod royalties;
mod storage;
mod timelock;
mod types;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod tests_multi_token;

#[cfg(test)]
mod tests_deposit_interest;

#[cfg(test)]
mod tests_multisig_governance;

#[cfg(test)]
mod tests_errors;

#[cfg(test)]
mod tests_royalties;

#[cfg(test)]
mod tests_rate_limit;

#[cfg(test)]
mod tests_multisig;

#[cfg(test)]
mod tests_timelock;

#[cfg(test)]
mod tests_version_pause;

#[cfg(test)]
mod tests_rbac;

#[cfg(test)]
mod tests_lease_negotiation;

#[cfg(test)]
mod tests_property;

#[cfg(test)]
mod tests_gas_benchmarks;

#[cfg(test)]
mod tests_contract_upgrade;

pub use agreement::{
    accept_extension, activate_extension, approve_agreement, cancel_agreement, cancel_extension,
    create_agreement, create_agreement_with_token, get_agreement, get_agreement_count,
    get_agreement_token, get_current_agreement_end, get_extension, get_extension_history,
    get_payment_history, get_payment_split, has_agreement, is_escrow_frozen,
    make_payment_with_token, propose_extension, reject_extension, release_escrow_with_token,
    set_escrow_frozen, sign_agreement, submit_agreement, update_metadata,
    validate_agreement_params,
};
pub use errors::RentalError;
pub use gas_optimization::{
    estimate_gas_cost, get_gas_metrics, optimize_operation, GasMetrics, OperationType,
    OptimizationSuggestion,
};
pub use multi_token::{
    add_supported_token, convert_amount, get_exchange_rate, get_supported_tokens,
    is_token_supported, remove_supported_token, set_exchange_rate,
};
pub use storage::DataKey;
pub use types::{
    ActionType, AdminProposal, AgreementExtension, AgreementInput, AgreementStatus, AgreementTerms,
    AgreementWithToken, Attribute, CompoundingFrequency, Config, ContractState,
    ContractUpgradeProposal, ContractVersion, DepositInterest, DepositInterestConfig, ErrorContext,
    ExtensionHistory, ExtensionStatus, InterestAccrual, InterestRecipient, MultiSigConfig,
    PauseState, PaymentSplit, RateLimitConfig, RateLimitReason, RentAgreement, RoyaltyConfig,
    RoyaltyPayment, SupportedToken, TimelockAction, TimelockActionType, TokenExchangeRate,
    UserCallCount, VersionStatus,
};

/// Storage layout version this WASM expects.
///
/// Bump this (and add a step to `Contract::migrate`) whenever a release
/// changes how existing state is stored, so an upgraded contract can bring
/// old data forward instead of losing it.
pub const STORAGE_VERSION: u32 = 1;

/// Chioma rental agreement contract.
///
/// @title Contract
#[contract]
pub struct Contract;

#[allow(clippy::too_many_arguments)]
#[contractimpl]
impl Contract {
    // --- Versioning Functions ---

    /// Get the current contract version.
    pub fn get_version(env: Env) -> ContractVersion {
        env.storage()
            .instance()
            .get(&DataKey::CurrentVersion)
            .unwrap_or(ContractVersion {
                major: 0,
                minor: 1,
                patch: 0,
                label: String::from_str(&env, "initial"),
                status: VersionStatus::Active,
                hash: Bytes::new(&env),
                updated_at: env.ledger().timestamp(),
            })
    }

    /// Record a new contract version (admin only).
    pub fn record_version(env: Env, version: ContractVersion) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::CurrentVersion, &version);

        let mut history: Vec<ContractVersion> = env
            .storage()
            .instance()
            .get(&DataKey::VersionHistory)
            .unwrap_or(Vec::new(&env));

        history.push_back(version.clone());
        env.storage()
            .instance()
            .set(&DataKey::VersionHistory, &history);
        env.storage().instance().extend_ttl(500000, 500000);

        events::version_updated(&env, version.major, version.minor, version.patch);

        Ok(())
    }

    /// Update the status of an existing version (admin only).
    pub fn update_version_status(
        env: Env,
        major: u32,
        minor: u32,
        patch: u32,
        status: VersionStatus,
    ) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        let mut history: Vec<ContractVersion> = env
            .storage()
            .instance()
            .get(&DataKey::VersionHistory)
            .ok_or(RentalError::InvalidState)?;

        let mut found = false;
        for i in 0..history.len() {
            let mut v = history.get(i).unwrap();
            if v.major == major && v.minor == minor && v.patch == patch {
                v.status = status.clone();
                history.set(i, v.clone());

                // If this is the current version, update it too
                let current = Self::get_version(env.clone());
                if current.major == major && current.minor == minor && current.patch == patch {
                    env.storage().instance().set(&DataKey::CurrentVersion, &v);
                }

                found = true;
                break;
            }
        }

        if !found {
            return Err(RentalError::InvalidState); // Version not found
        }

        env.storage()
            .instance()
            .set(&DataKey::VersionHistory, &history);
        Ok(())
    }

    /// Get the deployment history of the contract.
    pub fn get_version_history(env: Env) -> Vec<ContractVersion> {
        env.storage()
            .instance()
            .get(&DataKey::VersionHistory)
            .unwrap_or(Vec::new(&env))
    }

    /// Propose a contract upgrade governed by multi-sig approvals and timelock.
    ///
    /// `wasm_hash` must be the 32-byte hash of WASM already uploaded to the
    /// network (e.g. via `stellar contract upload`).
    /// @custom:error InvalidInput If the proposal ID exists or the hash is not 32 bytes.
    pub fn propose_contract_upgrade(
        env: Env,
        proposer: Address,
        proposal_id: String,
        wasm_hash: Bytes,
        notes: String,
        delay_seconds: u64,
    ) -> Result<(), RentalError> {
        proposer.require_auth();
        multi_sig::require_admin(&env, &proposer)?;

        if wasm_hash.len() != 32 {
            return Err(RentalError::InvalidInput);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::UpgradeProposal(proposal_id.clone()))
        {
            return Err(RentalError::InvalidInput);
        }

        let config = multi_sig::get_multisig_config(&env)?;
        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        let proposal = ContractUpgradeProposal {
            id: proposal_id.clone(),
            proposer,
            wasm_hash,
            approvals,
            required_signatures: config.required_signatures,
            eta: env.ledger().timestamp() + delay_seconds,
            executed: false,
            cancelled: false,
            notes,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);
        env.storage().persistent().extend_ttl(
            &DataKey::UpgradeProposal(proposal_id.clone()),
            500000,
            500000,
        );

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::UpgradeProposalCount)
            .unwrap_or(0);
        count += 1;
        env.storage()
            .instance()
            .set(&DataKey::UpgradeProposalCount, &count);

        let mut active: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveUpgradeProposals)
            .unwrap_or(Vec::new(&env));
        active.push_back(proposal_id.clone());
        env.storage()
            .instance()
            .set(&DataKey::ActiveUpgradeProposals, &active);

        events::upgrade_proposed(&env, proposal_id, proposal.eta);

        Ok(())
    }

    /// Approve a contract upgrade proposal as a multi-sig admin.
    pub fn approve_contract_upgrade(
        env: Env,
        approver: Address,
        proposal_id: String,
    ) -> Result<u32, RentalError> {
        approver.require_auth();
        multi_sig::require_admin(&env, &approver)?;

        let mut proposal: ContractUpgradeProposal = env
            .storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(proposal_id.clone()))
            .ok_or(RentalError::ProposalNotFound)?;

        if proposal.executed {
            return Err(RentalError::ProposalAlreadyExecuted);
        }

        for approved in proposal.approvals.iter() {
            if approved == approver {
                return Err(RentalError::AlreadyApproved);
            }
        }

        proposal.approvals.push_back(approver);
        let approvals = proposal.approvals.len();

        env.storage()
            .persistent()
            .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);

        events::upgrade_approved(&env, proposal_id, approvals);
        Ok(approvals)
    }

    /// Execute an approved upgrade proposal after ETA and record new version metadata.
    ///
    /// @notice Replaces this contract's WASM in place with the proposal's
    ///         `wasm_hash` (`update_current_contract_wasm`). The contract
    ///         address, balances, and all instance/persistent/temporary
    ///         storage are preserved; the new code takes effect once this
    ///         invocation completes. If the new release changes the storage
    ///         layout, the admin then calls `migrate` on the upgraded contract.
    /// @custom:error InvalidInput If the stored hash is not a valid 32-byte WASM hash.
    pub fn execute_contract_upgrade(
        env: Env,
        executor: Address,
        proposal_id: String,
        mut new_version: ContractVersion,
    ) -> Result<(), RentalError> {
        executor.require_auth();
        multi_sig::require_admin(&env, &executor)?;

        let mut proposal: ContractUpgradeProposal = env
            .storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(proposal_id.clone()))
            .ok_or(RentalError::ProposalNotFound)?;

        if proposal.executed {
            return Err(RentalError::ProposalAlreadyExecuted);
        }

        if env.ledger().timestamp() < proposal.eta {
            return Err(RentalError::TimelockEtaNotReached);
        }

        if proposal.approvals.len() < proposal.required_signatures {
            return Err(RentalError::InsufficientApprovals);
        }

        let new_wasm_hash: BytesN<32> = proposal
            .wasm_hash
            .clone()
            .try_into()
            .map_err(|_| RentalError::InvalidInput)?;

        proposal.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);

        let mut active: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::ActiveUpgradeProposals)
            .unwrap_or(Vec::new(&env));

        let mut remaining = Vec::new(&env);
        for id in active.iter() {
            if id != proposal_id {
                remaining.push_back(id);
            }
        }
        active = remaining;
        env.storage()
            .instance()
            .set(&DataKey::ActiveUpgradeProposals, &active);

        new_version.hash = proposal.wasm_hash;
        new_version.updated_at = env.ledger().timestamp();

        Self::record_version(env.clone(), new_version)?;
        events::upgrade_executed(&env, proposal_id.clone());

        env.deployer()
            .update_current_contract_wasm(new_wasm_hash.clone());
        events::contract_upgraded(&env, proposal_id, new_wasm_hash);

        Ok(())
    }

    /// Get the storage layout version currently persisted by the contract.
    ///
    /// Contracts deployed before storage versioning existed report `0`.
    pub fn get_storage_version(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::StorageVersion)
            .unwrap_or(0)
    }

    /// Migrate persisted state to the storage layout expected by this WASM.
    ///
    /// @notice Admin-only. Call once after `execute_contract_upgrade` has
    ///         installed a release whose `STORAGE_VERSION` is higher than the
    ///         stored version. Runs each pending migration step in order and
    ///         emits a `storage_migrated` event. Calling it when storage is
    ///         already current is a no-op, so it is safe to retry.
    /// @param env The Soroban environment.
    /// @return The storage version after migration.
    /// @custom:error InvalidState If the contract is not initialized, or the
    ///         stored version is newer than this WASM (downgrade attempt).
    pub fn migrate(env: Env) -> Result<u32, RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        let from_version = Self::get_storage_version(env.clone());
        if from_version > STORAGE_VERSION {
            return Err(RentalError::InvalidState);
        }
        if from_version == STORAGE_VERSION {
            return Ok(from_version);
        }

        // Each future release that changes the storage layout bumps
        // STORAGE_VERSION and rewrites existing state here, one step per
        // version between `from_version` and STORAGE_VERSION.
        //
        // Version 0 -> 1 only introduces the StorageVersion key itself, so
        // there is no data to rewrite yet.
        let to_version = STORAGE_VERSION;

        env.storage()
            .instance()
            .set(&DataKey::StorageVersion, &to_version);
        env.storage().instance().extend_ttl(500000, 500000);

        events::storage_migrated(&env, from_version, to_version);
        Ok(to_version)
    }

    /// Get a contract upgrade proposal by ID.
    ///
    /// @notice Read-only lookup of a proposal created via `propose_contract_upgrade`.
    /// @param env The Soroban environment.
    /// @param proposal_id Identifier of the upgrade proposal.
    /// @return The stored `ContractUpgradeProposal`.
    /// @custom:error ProposalNotFound If no proposal exists with this ID.
    /// @custom:security Read-only; no authorization required.
    pub fn get_upgrade_proposal(
        env: Env,
        proposal_id: String,
    ) -> Result<ContractUpgradeProposal, RentalError> {
        env.storage()
            .persistent()
            .get(&DataKey::UpgradeProposal(proposal_id))
            .ok_or(RentalError::ProposalNotFound)
    }

    /// List the IDs of all upgrade proposals that have not yet been executed.
    ///
    /// @notice Read-only; executed proposals are removed from this list.
    /// @param env The Soroban environment.
    /// @return Vector of active proposal IDs (empty if none).
    /// @custom:security Read-only; no authorization required.
    pub fn get_active_upgrade_proposals(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::ActiveUpgradeProposals)
            .unwrap_or(Vec::new(&env))
    }

    /// Get the total number of upgrade proposals ever created.
    ///
    /// @param env The Soroban environment.
    /// @return Proposal count (0 if none).
    /// @custom:security Read-only; no authorization required.
    pub fn get_upgrade_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeProposalCount)
            .unwrap_or(0)
    }

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
        env.storage()
            .instance()
            .set(&DataKey::StorageVersion, &STORAGE_VERSION);
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

    /// Guard for state-changing entry points.
    ///
    /// Fails with `ContractPaused` when either the whole contract is paused
    /// or the calling `function` has been paused individually via
    /// `pause_function`.
    fn check_paused(env: &Env, function: &str) -> Result<(), RentalError> {
        if Self::is_paused(env.clone()) {
            return Err(RentalError::ContractPaused);
        }
        if Self::is_function_paused(env.clone(), Symbol::new(env, function)) {
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

    /// Pause the contract (emergency stop).
    ///
    /// @notice Blocks every entry point guarded by `check_paused` until `unpause`
    ///         is called. Emits a `paused` event.
    /// @param env The Soroban environment.
    /// @param reason Human-readable reason recorded in the pause state and event.
    /// @return Ok(()) on success.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:error AlreadyPaused If the contract is already paused.
    /// @custom:security Admin only: requires `admin.require_auth()`.
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

    /// Unpause the contract, restoring all guarded entry points.
    ///
    /// @notice Clears the pause state and emits an `unpaused` event.
    /// @param env The Soroban environment.
    /// @return Ok(()) on success.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:error NotPaused If the contract is not currently paused.
    /// @custom:security Admin only: requires `admin.require_auth()`.
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

    /// Whether the contract is currently paused.
    ///
    /// @notice Checks the dedicated pause state first, then falls back to
    ///         `config.paused`.
    /// @param env The Soroban environment.
    /// @return `true` if paused, otherwise `false` (also `false` before initialization).
    /// @custom:security Read-only; no authorization required.
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

    /// Pause a single contract function without halting the whole contract.
    ///
    /// @notice Admin-only emergency switch for one entry point (e.g.
    ///         `make_payment_with_token`) while the rest of the contract keeps
    ///         working. Calls to the paused function fail with
    ///         `ContractPaused`. Emits a `function_paused` event.
    /// @param env The Soroban environment.
    /// @param function Name of the contract function to pause.
    /// @param reason Human-readable reason, recorded in the event.
    /// @custom:error InvalidState If the contract is not initialized.
    /// @custom:error AlreadyPaused If the function is already paused.
    pub fn pause_function(env: Env, function: Symbol, reason: String) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        let key = DataKey::PausedFunction(function.clone());
        if env.storage().instance().has(&key) {
            return Err(RentalError::AlreadyPaused);
        }

        env.storage().instance().set(&key, &reason);
        env.storage().instance().extend_ttl(500000, 500000);

        events::function_paused(&env, function, state.admin, reason);
        Ok(())
    }

    /// Resume a function previously paused with `pause_function`.
    ///
    /// @notice Admin-only. Emits a `function_unpaused` event.
    /// @param env The Soroban environment.
    /// @param function Name of the contract function to resume.
    /// @custom:error InvalidState If the contract is not initialized.
    /// @custom:error NotPaused If the function is not paused.
    pub fn unpause_function(env: Env, function: Symbol) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        let key = DataKey::PausedFunction(function.clone());
        if !env.storage().instance().has(&key) {
            return Err(RentalError::NotPaused);
        }

        env.storage().instance().remove(&key);

        events::function_unpaused(&env, function, state.admin);
        Ok(())
    }

    /// Check whether a specific function is individually paused.
    ///
    /// Does not reflect the global pause; see `is_paused` for that.
    pub fn is_function_paused(env: Env, function: Symbol) -> bool {
        env.storage()
            .instance()
            .has(&DataKey::PausedFunction(function))
    }

    // --- Token Management Functions ---

    /// Add a token to the list of supported payment tokens.
    ///
    /// @notice Emits a `token_added` event.
    /// @param env The Soroban environment.
    /// @param token_address Address of the token contract.
    /// @param symbol Display symbol of the token.
    /// @param decimals Number of decimals the token uses.
    /// @param min_amount Minimum accepted payment amount in this token.
    /// @param max_amount Maximum accepted payment amount in this token.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:security Admin only: requires `admin.require_auth()`.
    pub fn add_supported_token(
        env: Env,
        token_address: Address,
        symbol: String,
        decimals: u32,
        min_amount: i128,
        max_amount: i128,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "add_supported_token")?;
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

    /// Remove a token from the list of supported payment tokens.
    ///
    /// @notice Emits a `token_removed` event.
    /// @param env The Soroban environment.
    /// @param token_address Address of the token contract to remove.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:security Admin only: requires `admin.require_auth()`.
    pub fn remove_supported_token(env: Env, token_address: Address) -> Result<(), RentalError> {
        Self::check_paused(&env, "remove_supported_token")?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_token::remove_supported_token(env, token_address)
    }

    /// List all supported payment tokens.
    ///
    /// @param env The Soroban environment.
    /// @return Vector of `SupportedToken` entries.
    /// @custom:security Read-only; no authorization required.
    pub fn get_supported_tokens(env: Env) -> Result<Vec<SupportedToken>, RentalError> {
        multi_token::get_supported_tokens(env)
    }

    /// Whether a token is accepted for payments.
    ///
    /// @param env The Soroban environment.
    /// @param token_address Address of the token contract.
    /// @return `true` if the token is supported.
    /// @custom:security Read-only; no authorization required.
    pub fn is_token_supported(env: Env, token_address: Address) -> Result<bool, RentalError> {
        multi_token::is_token_supported(env, token_address)
    }

    // --- Exchange Rate Functions ---

    /// Set the exchange rate between two tokens.
    ///
    /// @notice Rates are fixed-point with 18 decimals (1e18 == 1:1).
    ///         Emits an `exchange_rate_updated` event.
    /// @param env The Soroban environment.
    /// @param from_token Source token address.
    /// @param to_token Destination token address.
    /// @param rate Exchange rate scaled by 1e18.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:security Admin only: requires `admin.require_auth()`.
    pub fn set_exchange_rate(
        env: Env,
        from_token: Address,
        to_token: Address,
        rate: i128,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "set_exchange_rate")?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_token::set_exchange_rate(env, from_token, to_token, rate)
    }

    /// Get the exchange rate between two tokens.
    ///
    /// @param env The Soroban environment.
    /// @param from_token Source token address.
    /// @param to_token Destination token address.
    /// @return Exchange rate scaled by 1e18.
    /// @custom:security Read-only; no authorization required.
    pub fn get_exchange_rate(
        env: Env,
        from_token: Address,
        to_token: Address,
    ) -> Result<i128, RentalError> {
        multi_token::get_exchange_rate(env, from_token, to_token)
    }

    /// Set several exchange rates in a single call.
    ///
    /// @notice Applies each `(from, to, rate)` tuple in order; the whole call
    ///         reverts if any single update fails.
    /// @param env The Soroban environment.
    /// @param rates Vector of `(from_token, to_token, rate)` tuples, rates scaled by 1e18.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the contract has not been initialized.
    /// @custom:security Admin only: requires `admin.require_auth()`.
    pub fn update_exchange_rates(
        env: Env,
        rates: Vec<(Address, Address, i128)>,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "update_exchange_rates")?;
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        for (from, to, rate) in rates.iter() {
            multi_token::set_exchange_rate(env.clone(), from, to, rate)?;
        }
        Ok(())
    }

    /// Convert an amount from one token to another using the stored rate.
    ///
    /// @notice Returns `amount` unchanged when both tokens are the same.
    /// @param env The Soroban environment.
    /// @param from_token Source token address.
    /// @param to_token Destination token address.
    /// @param amount Amount denominated in `from_token`.
    /// @return Converted amount denominated in `to_token`.
    /// @custom:error ConversionError If the multiplication overflows.
    /// @custom:security Read-only; no authorization required. Uses checked
    ///         multiplication to avoid overflow.
    pub fn convert_amount(
        env: Env,
        from_token: Address,
        to_token: Address,
        amount: i128,
    ) -> Result<i128, RentalError> {
        multi_token::convert_amount(env, from_token, to_token, amount)
    }

    // --- Agreement Functions with Token ---

    /// Create a rental agreement that is paid in a specific supported token.
    ///
    /// @notice Same as `create_agreement`, but first checks that
    ///         `input.payment_token` is supported and records it under
    ///         `AgreementToken`. Emits `booking_created` and `agreement_created` events.
    /// @param env The Soroban environment.
    /// @param input Agreement parameters (parties, terms, payment token, metadata).
    /// @return The ID of the created agreement.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error TokenNotSupported If the payment token is not supported.
    /// @custom:error AgreementAlreadyExists If the agreement ID is already used.
    /// @custom:security Requires authorization from the tenant (`input.user`).
    pub fn create_agreement_with_token(
        env: Env,
        input: crate::types::AgreementInput,
    ) -> Result<String, RentalError> {
        Self::check_paused(&env, "create_agreement_with_token")?;
        agreement::create_agreement_with_token(&env, input)
    }

    /// Get the payment token recorded for an agreement.
    ///
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return Address of the payment token.
    /// @custom:error AgreementNotFound If no token is recorded for the agreement.
    /// @custom:security Read-only; no authorization required.
    pub fn get_agreement_token(env: Env, agreement_id: String) -> Result<Address, RentalError> {
        agreement::get_agreement_token(&env, agreement_id)
    }

    // --- Payment Functions with Token ---

    /// Pay rent for an agreement using a specific token.
    ///
    /// @notice Converts the amount to the agreement's token when needed, moves the
    ///         funds into contract escrow and emits a `payment_made_with_token` event.
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @param amount Amount to pay, denominated in `token`.
    /// @param token Address of the token used for payment.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error AgreementNotFound If the agreement does not exist.
    /// @custom:error AgreementNotActive If the agreement is not active.
    /// @custom:error InsufficientPayment If the converted amount is below the rent due.
    /// @custom:security Requires authorization from the agreement's tenant.
    pub fn make_payment_with_token(
        env: Env,
        agreement_id: String,
        amount: i128,
        token: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "make_payment_with_token")?;
        agreement::make_payment_with_token(&env, agreement_id, amount, token)
    }

    /// Release escrowed funds for an agreement in the given token.
    ///
    /// @notice Emits an `escrow_released_with_token` event.
    /// @param env The Soroban environment.
    /// @param escrow_id Identifier of the escrow (agreement ID).
    /// @param token Address of the token held in escrow.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the escrow cannot be released.
    /// @custom:security Requires authorization from the agreement's landlord.
    pub fn release_escrow_with_token(
        env: Env,
        escrow_id: String,
        token: Address,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "release_escrow_with_token")?;
        agreement::release_escrow_with_token(&env, escrow_id, token)
    }

    /// Freeze escrow funds for a specific agreement.
    ///
    /// Can be called by system admin or a configured multi-sig admin (DAO-voted entity).
    pub fn freeze_escrow(env: Env, caller: Address, escrow_id: String) -> Result<(), RentalError> {
        caller.require_auth();
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        let is_system_admin = caller == state.admin;
        let is_dao_admin = multi_sig::is_admin(&env, &caller).unwrap_or(false);

        if !is_system_admin && !is_dao_admin {
            return Err(RentalError::Unauthorized);
        }

        agreement::set_escrow_frozen(&env, escrow_id, true)
    }

    /// Unfreeze escrow funds for a specific agreement.
    ///
    /// Can be called by system admin or a configured multi-sig admin (DAO-voted entity).
    pub fn unfreeze_escrow(
        env: Env,
        caller: Address,
        escrow_id: String,
    ) -> Result<(), RentalError> {
        caller.require_auth();
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        let is_system_admin = caller == state.admin;
        let is_dao_admin = multi_sig::is_admin(&env, &caller).unwrap_or(false);

        if !is_system_admin && !is_dao_admin {
            return Err(RentalError::Unauthorized);
        }

        agreement::set_escrow_frozen(&env, escrow_id, false)
    }

    /// Check whether escrow funds are currently frozen for an agreement.
    pub fn is_escrow_frozen(env: Env, escrow_id: String) -> bool {
        agreement::is_escrow_frozen(&env, escrow_id)
    }

    /// Create a new rental agreement.
    ///
    /// @notice Creates a draft agreement. Tenant must authorize. Reverts if contract is paused.
    ///         Emits `booking_created` and `agreement_created` events.
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
        Self::check_paused(&env, "create_agreement")?;
        agreement::create_agreement(&env, input)
    }

    /// Sign an existing rental agreement.
    ///
    /// @notice Tenant signs a pending agreement, moving it to PendingApproval.
    ///         A witness must then call `approve_agreement` to activate it.
    /// @param env The Soroban environment.
    /// @param tenant Address of the tenant signing (must authorize).
    /// @param agreement_id Identifier of the agreement to sign.
    /// @return Ok(()) on success.
    pub fn sign_agreement(
        env: Env,
        user: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "sign_agreement")?;
        agreement::sign_agreement(&env, user, agreement_id)
    }

    /// Approve a pending agreement as a witness (PendingApproval → Active).
    ///
    /// @notice Admin or designated agent witnesses the agreement, permanently recording
    ///         their ID and activating the escrow. Payouts cannot be triggered before
    ///         this call succeeds.
    /// @param env The Soroban environment.
    /// @param approver Address of the approving witness (must authorize).
    /// @param agreement_id Identifier of the agreement to approve.
    /// @return Ok(()) on success.
    pub fn approve_agreement(
        env: Env,
        approver: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "approve_agreement")?;
        agreement::approve_agreement(&env, approver, agreement_id)
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
        admin: Address,
        agreement_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "submit_agreement")?;
        agreement::submit_agreement(&env, admin, agreement_id)
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
        Self::check_paused(&env, "cancel_agreement")?;
        agreement::cancel_agreement(&env, caller, agreement_id)
    }

    /// Propose extending an existing agreement.
    ///
    /// @notice Creates an extension starting at the agreement's current end date.
    ///         Rent and deposit may optionally be changed. Emits an
    ///         `extension_proposed` event.
    /// @param env The Soroban environment.
    /// @param caller Landlord or tenant proposing the extension.
    /// @param agreement_id Identifier of the agreement to extend.
    /// @param extension_months Number of months to extend by (must be > 0).
    /// @param new_rent Optional new monthly rent for the extension period.
    /// @param new_deposit Optional new security deposit for the extension period.
    /// @return The ID of the new extension proposal.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error AgreementNotFound If the agreement does not exist.
    /// @custom:error Unauthorized If the caller is neither landlord nor tenant.
    /// @custom:error InvalidInput If `extension_months` is 0.
    /// @custom:security Requires `caller.require_auth()`; caller must be a party to the agreement.
    pub fn propose_extension(
        env: Env,
        caller: Address,
        agreement_id: String,
        extension_months: u32,
        new_rent: Option<i128>,
        new_deposit: Option<i128>,
    ) -> Result<String, RentalError> {
        Self::check_paused(&env, "propose_extension")?;
        agreement::propose_extension(
            &env,
            caller,
            agreement_id,
            extension_months,
            new_rent,
            new_deposit,
        )
    }

    /// Accept a proposed agreement extension.
    ///
    /// @notice Records the caller's acceptance. Once both landlord and tenant have
    ///         accepted, the extension moves to Accepted and an
    ///         `extension_accepted` event is emitted.
    /// @param env The Soroban environment.
    /// @param caller Landlord or tenant accepting the extension.
    /// @param extension_id Identifier of the extension.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the extension is not in Proposed state.
    /// @custom:error Unauthorized If the caller is neither landlord nor tenant.
    /// @custom:security Requires `caller.require_auth()`; caller must be a party to the agreement.
    pub fn accept_extension(
        env: Env,
        caller: Address,
        extension_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "accept_extension")?;
        agreement::accept_extension(&env, caller, extension_id)
    }

    /// Reject a proposed agreement extension.
    ///
    /// @notice Moves the extension to Rejected and emits an `extension_rejected` event.
    /// @param env The Soroban environment.
    /// @param caller Landlord or tenant rejecting the extension.
    /// @param extension_id Identifier of the extension.
    /// @param reason Human-readable rejection reason.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error Unauthorized If the caller is neither landlord nor tenant.
    /// @custom:security Requires `caller.require_auth()`; caller must be a party to the agreement.
    pub fn reject_extension(
        env: Env,
        caller: Address,
        extension_id: String,
        reason: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "reject_extension")?;
        agreement::reject_extension(&env, caller, extension_id, reason)
    }

    /// Activate an accepted extension, applying its terms to the agreement.
    ///
    /// @notice Updates the agreement's end date, rent and deposit, then emits an
    ///         `extension_activated` event.
    /// @param env The Soroban environment.
    /// @param caller Landlord of the agreement.
    /// @param extension_id Identifier of the extension.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error InvalidState If the extension is not in Accepted state.
    /// @custom:error Unauthorized If the caller is not the landlord.
    /// @custom:security Requires `caller.require_auth()`; landlord only.
    pub fn activate_extension(
        env: Env,
        caller: Address,
        extension_id: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "activate_extension")?;
        agreement::activate_extension(&env, caller, extension_id)
    }

    /// Cancel an extension that is not yet completed.
    ///
    /// @notice Moves the extension to Cancelled and emits an `extension_cancelled` event.
    /// @param env The Soroban environment.
    /// @param caller Landlord or tenant cancelling the extension.
    /// @param extension_id Identifier of the extension.
    /// @param reason Human-readable cancellation reason.
    /// @return Ok(()) on success.
    /// @custom:error ContractPaused If the contract is paused.
    /// @custom:error Unauthorized If the caller is neither landlord nor tenant.
    /// @custom:error InvalidState If the extension is already completed or cancelled.
    /// @custom:security Requires `caller.require_auth()`; caller must be a party to the agreement.
    pub fn cancel_extension(
        env: Env,
        caller: Address,
        extension_id: String,
        reason: String,
    ) -> Result<(), RentalError> {
        Self::check_paused(&env, "cancel_extension")?;
        agreement::cancel_extension(&env, caller, extension_id, reason)
    }

    /// Get an agreement extension by ID.
    ///
    /// @param env The Soroban environment.
    /// @param extension_id Identifier of the extension.
    /// @return The stored `AgreementExtension`.
    /// @custom:error AgreementNotFound If the extension does not exist.
    /// @custom:security Read-only; no authorization required.
    pub fn get_extension(
        env: Env,
        extension_id: String,
    ) -> Result<AgreementExtension, RentalError> {
        agreement::get_extension(&env, extension_id)
    }

    /// Get the extension history of an agreement.
    ///
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return The agreement's `ExtensionHistory`.
    /// @custom:security Read-only; no authorization required.
    pub fn get_extension_history(
        env: Env,
        agreement_id: String,
    ) -> Result<ExtensionHistory, RentalError> {
        agreement::get_extension_history(&env, agreement_id)
    }

    /// Get the current end date of an agreement, including activated extensions.
    ///
    /// @param env The Soroban environment.
    /// @param agreement_id Identifier of the agreement.
    /// @return End date as a Unix timestamp.
    /// @custom:error AgreementNotFound If the agreement does not exist.
    /// @custom:security Read-only; no authorization required.
    pub fn get_current_agreement_end(env: Env, agreement_id: String) -> Result<u64, RentalError> {
        agreement::get_current_agreement_end(&env, agreement_id)
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
        Self::check_paused(&env, "update_metadata")?;
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
        Self::check_paused(&env, "set_deposit_interest_config")?;
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
        Self::check_paused(&env, "accrue_interest")?;
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
        Self::check_paused(&env, "distribute_interest")?;
        deposit_interest::distribute_interest(env, escrow_id)
    }

    /// (Keeper / oracle entry-point) Accrue interest for all deposits.
    pub fn process_interest_accruals(env: Env) -> Result<Vec<String>, RentalError> {
        Self::check_paused(&env, "process_interest_accruals")?;
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
        Self::check_paused(&env, "set_royalty")?;
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
        Self::check_paused(&env, "transfer_with_royalty")?;
        royalties::transfer_with_royalty(env, token_id, to, sale_price)
    }

    /// Get the royalty payment history for a token.
    pub fn get_royalty_payments(
        env: Env,
        token_id: String,
    ) -> Result<Vec<RoyaltyPayment>, RentalError> {
        royalties::get_royalty_payments(env, token_id)
    }

    // ─── Rate Limiting Functions ──────────────────────────────────────────────

    /// Set rate limit configuration (admin only).
    pub fn set_rate_limit_config(env: Env, config: RateLimitConfig) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        rate_limit::set_rate_limit_config(&env, config.clone())?;

        events::rate_limit_config_updated(
            &env,
            config.max_calls_per_block,
            config.max_calls_per_user_per_day,
            config.cooldown_blocks,
        );

        Ok(())
    }

    /// Get current rate limit configuration.
    pub fn get_rate_limit_config(env: Env) -> RateLimitConfig {
        rate_limit::get_rate_limit_config(&env)
    }

    /// Get user call statistics for a specific function.
    pub fn get_user_call_count(
        env: Env,
        user: Address,
        function_name: String,
    ) -> Option<UserCallCount> {
        rate_limit::get_user_call_count(&env, &user, function_name)
    }

    /// Get current block call count for a function.
    pub fn get_block_call_count(env: Env, function_name: String) -> u32 {
        rate_limit::get_block_call_count(&env, function_name)
    }

    /// Reset rate limits for a user (admin only, emergency use).
    pub fn reset_user_rate_limit(
        env: Env,
        user: Address,
        function_name: String,
    ) -> Result<(), RentalError> {
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        rate_limit::reset_user_rate_limit(&env, &user, function_name)
    }

    // ─── Multi-Sig Admin Functions ───────────────────────────────────────────

    /// Initialize multi-sig configuration with initial admins and required signatures
    pub fn initialize_multisig(
        env: Env,
        admins: Vec<Address>,
        required_signatures: u32,
    ) -> Result<(), RentalError> {
        // Only contract admin can initialize multi-sig
        let state = Self::get_state(env.clone()).ok_or(RentalError::InvalidState)?;
        state.admin.require_auth();

        multi_sig::initialize_multisig(&env, admins, required_signatures)
    }

    /// Get current multi-sig configuration
    pub fn get_multisig_config(env: Env) -> Result<MultiSigConfig, RentalError> {
        multi_sig::get_multisig_config(&env)
    }

    /// Check if an address is an admin
    pub fn is_admin(env: Env, address: Address) -> Result<bool, RentalError> {
        multi_sig::is_admin(&env, &address)
    }

    /// Propose an admin action (pause, unpause, config update, etc.)
    pub fn propose_action(
        env: Env,
        proposer: Address,
        action_type: ActionType,
        target: Option<Address>,
        data: soroban_sdk::Bytes,
    ) -> Result<String, RentalError> {
        multi_sig::propose_action(&env, proposer, action_type, target, data)
    }

    /// Approve a pending proposal
    pub fn approve_action(
        env: Env,
        approver: Address,
        proposal_id: String,
    ) -> Result<(), RentalError> {
        multi_sig::approve_action(&env, approver, proposal_id)
    }

    /// Execute a proposal that has sufficient approvals
    pub fn execute_action(
        env: Env,
        executor: Address,
        proposal_id: String,
    ) -> Result<(), RentalError> {
        multi_sig::execute_action(&env, executor, proposal_id)
    }

    /// Reject/cancel a proposal (only proposer can do this)
    pub fn reject_action(
        env: Env,
        caller: Address,
        proposal_id: String,
    ) -> Result<(), RentalError> {
        multi_sig::reject_action(&env, caller, proposal_id)
    }

    /// Add a new admin (must be called through proposal execution)
    pub fn add_admin(env: Env, new_admin: Address) -> Result<(), RentalError> {
        // This should only be called through execute_action after approval
        // For now, we'll add a check for multi-sig admin
        let caller = new_admin.clone(); // In real scenario, get from context
        multi_sig::require_admin(&env, &caller)?;
        multi_sig::add_admin_internal(&env, new_admin)
    }

    /// Remove an admin (must be called through proposal execution)
    pub fn remove_admin(env: Env, admin_to_remove: Address) -> Result<(), RentalError> {
        // This should only be called through execute_action after approval
        multi_sig::remove_admin_internal(&env, admin_to_remove)
    }

    /// Update required signatures (must be called through proposal execution)
    pub fn update_required_signatures(env: Env, new_required: u32) -> Result<(), RentalError> {
        // This should only be called through execute_action after approval
        multi_sig::update_required_signatures_internal(&env, new_required)
    }

    /// Get a proposal by ID
    pub fn get_proposal(env: Env, proposal_id: String) -> Result<AdminProposal, RentalError> {
        multi_sig::get_proposal(&env, proposal_id)
    }

    /// Get all active proposals
    pub fn get_active_proposals(env: Env) -> Result<Vec<String>, RentalError> {
        multi_sig::get_active_proposals(&env)
    }

    /// Get total proposal count
    pub fn get_proposal_count(env: Env) -> u32 {
        multi_sig::get_proposal_count(&env)
    }

    // ─── Timelock Functions ───────────────────────────────────────────────────

    /// Queue an admin action that can only be executed after the mandatory delay.
    ///
    /// `delay` is in seconds and must meet the minimum for the given `action_type`:
    /// UpdateAdmin (7 days), UpdateConfig (3 days), UpdateRates (2 days),
    /// PauseContract (1 day), UnpauseContract (1 hour).
    pub fn queue_timelock_action(
        env: Env,
        caller: Address,
        action_type: TimelockActionType,
        target: Address,
        data: soroban_sdk::Bytes,
        delay: u64,
    ) -> Result<String, RentalError> {
        timelock::queue_action(&env, caller, action_type, target, data, delay)
    }

    /// Execute a queued timelock action once its ETA has been reached.
    pub fn execute_timelock_action(
        env: Env,
        caller: Address,
        action_id: String,
    ) -> Result<(), RentalError> {
        timelock::execute_action(&env, caller, action_id)
    }

    /// Cancel a queued timelock action (admin only).
    pub fn cancel_timelock_action(
        env: Env,
        caller: Address,
        action_id: String,
    ) -> Result<(), RentalError> {
        timelock::cancel_action(&env, caller, action_id)
    }

    /// Accept a queued admin transfer (second step of the two-step rotation).
    ///
    /// The current admin proposes a rotation via `queue_timelock_action` with
    /// `action_type: UpdateAdmin` and `target` set to the proposed new admin.
    /// Once the 7-day delay has elapsed, the proposed new admin (not anyone
    /// else) calls this to actually take over as admin. The current admin can
    /// cancel the proposal any time before this via `cancel_timelock_action`.
    pub fn accept_admin_transfer(
        env: Env,
        caller: Address,
        action_id: String,
    ) -> Result<(), RentalError> {
        timelock::accept_admin_transfer(&env, caller, action_id)
    }

    /// Retrieve a timelock action by ID.
    pub fn get_timelock_action(env: Env, action_id: String) -> Result<TimelockAction, RentalError> {
        timelock::get_action(&env, action_id)
    }

    /// Get all active (pending) timelock action IDs.
    pub fn get_active_timelock_actions(env: Env) -> Vec<String> {
        timelock::get_active_actions(&env)
    }

    /// Get total count of timelock actions ever queued.
    pub fn get_timelock_action_count(env: Env) -> u32 {
        timelock::get_action_count(&env)
    }

    // ─── Gas Optimisation ─────────────────────────────────────────────────────

    /// Estimate the gas cost for a given operation type.
    ///
    /// Returns a conservative upper-bound estimate in Soroban gas units.
    pub fn estimate_gas_cost(env: Env, operation: OperationType) -> Result<u64, RentalError> {
        gas_optimization::estimate_gas_cost(env, operation)
    }

    /// Return persisted gas metrics for all tracked operations.
    pub fn get_gas_metrics(env: Env) -> Result<Vec<GasMetrics>, RentalError> {
        gas_optimization::get_gas_metrics(env)
    }

    /// Return an optimisation suggestion for the given operation.
    pub fn optimize_operation(
        env: Env,
        operation: OperationType,
    ) -> Result<OptimizationSuggestion, RentalError> {
        gas_optimization::optimize_operation(env, operation)
    }
}
