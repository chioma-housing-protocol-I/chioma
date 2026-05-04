//! Core escrow lifecycle logic: creation, funding, approvals, and release.
//! Implements checks-effects-interactions pattern for reentrancy safety.
use soroban_sdk::{contract, contractimpl, token, xdr::ToXdr, Address, BytesN, Env, String};

use crate::access::AccessControl;
use crate::dispute::DisputeHandler;
use crate::errors::EscrowError;
use crate::events;
use crate::rate_limit;
use crate::storage::EscrowStorage;
use crate::upgrade;
use crate::types::{Escrow, EscrowStatus, ReleaseApproval, ReleaseRecord, TimeoutConfig};

/// Core escrow contract implementation.
#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Create a new escrow.
    ///
    /// CHECKS:
    /// - Amount must be positive
    /// - All addresses must be distinct
    ///
    /// EFFECTS:
    /// - Creates new Escrow with Pending status
    /// - Stores escrow in persistent storage
    /// - Increments escrow counter
    ///
    /// INTERACTIONS:
    /// - Token transfer from depositor (not yet implemented in this version)
    ///   would happen after state update
    pub fn create(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        arbiter: Address,
        platform_governance: Address,
        agent_referral: Address,
        amount: i128,
        token: Address,
    ) -> Result<BytesN<32>, EscrowError> {
        // CHECKS: Validate inputs
        if amount <= 0 {
            return Err(EscrowError::InsufficientFunds);
        }

        // Ensure primary parties are distinct
        if depositor == beneficiary || depositor == arbiter || beneficiary == arbiter {
            return Err(EscrowError::InvalidSigner);
        }

        // Generate unique escrow ID from hash of parameters
        let mut data = soroban_sdk::Bytes::new(&env);
        data.append(&depositor.clone().to_xdr(&env));
        data.append(&beneficiary.clone().to_xdr(&env));
        data.append(&arbiter.clone().to_xdr(&env));
        data.append(&amount.to_xdr(&env));
        data.append(&token.clone().to_xdr(&env));
        data.append(&env.ledger().timestamp().to_xdr(&env));

        let escrow_id: BytesN<32> = env.crypto().sha256(&data).into();

        // EFFECTS: Create and save escrow
        let escrow = Escrow {
            id: escrow_id.clone(),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            platform_governance,
            agent_referral,
            amount,
            token,
            status: EscrowStatus::Pending,
            created_at: env.ledger().timestamp(),
            timeout_days: EscrowStorage::get_timeout_config(&env).escrow_timeout_days,
            disputed_at: None,
            dispute_reason: None,
            is_frozen: false,
            frozen_at: None,
            freeze_reason: None,
        };

        EscrowStorage::save(&env, &escrow);
        EscrowStorage::increment_count(&env);

        Ok(escrow_id)
    }

    /// Fund an existing escrow by depositing funds.
    /// Transitions status from Pending to Funded.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Pending state
    /// - Caller must be depositor
    ///
    /// EFFECTS:
    /// - Update escrow status to Funded
    ///
    /// INTERACTIONS:
    /// - Token transfer would happen after state update (not yet in this version)
    pub fn fund_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is depositor
        AccessControl::is_depositor(&escrow, &caller)?;

        // Verify escrow is in Pending state
        if escrow.status != EscrowStatus::Pending {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the deposit
        caller.require_auth();

        // EFFECTS: Update status
        escrow.status = EscrowStatus::Funded;
        EscrowStorage::save(&env, &escrow);

        // INTERACTIONS: Token transfer from depositor to escrow contract
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&caller, env.current_contract_address(), &escrow.amount);

        Ok(())
    }

    /// Approve release of funds to a target address.
    /// Implements 2-of-3 multi-sig: executes transfer when ≥2 unique signers approve same target.
    ///
    /// CHECKS:
    /// - Escrow must exist and be Funded (or Disputed if arbiter)
    /// - Escrow must not be frozen
    /// - Caller must be a valid party
    /// - Release target must be beneficiary or depositor
    /// - Caller must not have already approved this same target
    ///
    /// EFFECTS:
    /// - Add approval to storage
    /// - Count approvals; if ≥2 unique parties approve same target, update escrow status
    /// - Clear approvals after execution
    ///
    /// INTERACTIONS:
    /// - Token transfer after all state updates
    pub fn approve_release(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Check if escrow is frozen
        AccessControl::require_not_frozen(&escrow)?;

        // Verify caller is a valid party
        AccessControl::is_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the approval
        caller.require_auth();

        // Rate limiting check
        rate_limit::check_rate_limit(&env, &caller, "approve_release")?;

        // Verify release target is valid (must be beneficiary or depositor)
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // Check for duplicate approval using O(1) storage lookup
        if EscrowStorage::has_signer_approved(&env, &escrow_id, &caller, &release_to) {
            return Err(EscrowError::AlreadySigned);
        }

        // EFFECTS: Record the approval flag and increment the counter
        EscrowStorage::set_signer_approved(&env, &escrow_id, &caller, &release_to);
        EscrowStorage::increment_approval_count(&env, &escrow_id, &release_to);

        // Also persist the approval record for audit trail
        let new_approval = ReleaseApproval {
            signer: caller.clone(),
            release_to: release_to.clone(),
            timestamp: env.ledger().timestamp(),
        };
        EscrowStorage::add_approval(&env, &escrow_id, new_approval);

        // Read the updated count via O(1) lookup
        let approval_count =
            EscrowStorage::get_approval_count_for_target(&env, &escrow_id, &release_to);

        // If 2 or more unique signers approve, execute release
        if approval_count >= 2 {
            let mut escrow_to_update =
                EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Determine final status based on release target
            escrow_to_update.status = EscrowStatus::Released;
            EscrowStorage::save(&env, &escrow_to_update);

            // Clear approvals and counters after execution
            EscrowStorage::clear_approvals(&env, &escrow_id);
            let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
            let signers = [
                escrow.depositor.clone(),
                escrow.beneficiary.clone(),
                escrow.arbiter.clone(),
            ];
            EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

            // INTERACTIONS: Token transfer from escrow contract to release target
            let token_client = token::Client::new(&env, &escrow.token);
            token_client.transfer(&env.current_contract_address(), &release_to, &escrow.amount);
        }

        Ok(())
    }

    /// Set up a dispute on an escrow.
    pub fn initiate_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        DisputeHandler::initiate_dispute(env, escrow_id, caller, reason)
    }

    /// Resolve a dispute by releasing funds to a target.
    pub fn resolve_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        DisputeHandler::resolve_dispute(env, escrow_id, caller, release_to)
    }

    /// Refund escrow to depositor if escrow timeout has elapsed.
    /// Intended for stale escrows that are not released yet.
    pub fn release_escrow_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Pending && escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        let timeout_seconds = escrow.timeout_days.saturating_mul(86_400);
        let deadline = escrow.created_at.saturating_add(timeout_seconds);
        let now = env.ledger().timestamp();
        if now <= deadline {
            return Err(EscrowError::TimeoutNotReached);
        }

        escrow.status = EscrowStatus::Refunded;
        EscrowStorage::save(&env, &escrow);

        EscrowStorage::clear_approvals(&env, &escrow_id);
        let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.depositor,
            &escrow.amount,
        );

        events::escrow_timeout(&env, escrow_id);
        Ok(())
    }

    /// Resolve disputed escrow on timeout by auto-refunding the depositor.
    pub fn resolve_dispute_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        DisputeHandler::resolve_dispute_on_timeout(env, escrow_id)
    }

    /// Set contract-level timeout config.
    pub fn set_timeout_config(
        env: Env,
        caller: Address,
        config: TimeoutConfig,
    ) -> Result<(), EscrowError> {
        caller.require_auth();

        if config.escrow_timeout_days == 0
            || config.dispute_timeout_days == 0
            || config.payment_timeout_days == 0
        {
            return Err(EscrowError::InvalidTimeoutConfig);
        }

        EscrowStorage::set_timeout_config(&env, &config);
        Ok(())
    }

    /// Get contract-level timeout config.
    pub fn get_timeout_config(env: Env) -> TimeoutConfig {
        EscrowStorage::get_timeout_config(&env)
    }

    /// Get details of an escrow.
    /// Read-only view function.
    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> Result<Escrow, EscrowError> {
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)
    }

    /// Get approval count for a specific release target.
    /// Returns number of unique signers approving release to a specific address.
    /// Uses O(1) dedicated counter storage instead of iterating the approvals list.
    pub fn get_approval_count(
        env: Env,
        escrow_id: BytesN<32>,
        release_to: Address,
    ) -> Result<u32, EscrowError> {
        // Verify escrow exists
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(EscrowStorage::get_approval_count_for_target(
            &env,
            &escrow_id,
            &release_to,
        ))
    }

    /// Approve a partial release without auto-executing.
    /// This is used for partial releases where we don't want automatic full release.
    pub fn approve_partial_release(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a valid party
        AccessControl::is_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the approval
        caller.require_auth();

        // Verify release target is valid (must be beneficiary or depositor)
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // Check for duplicate approval using O(1) storage lookup
        if EscrowStorage::has_signer_approved(&env, &escrow_id, &caller, &release_to) {
            return Err(EscrowError::AlreadySigned);
        }

        // EFFECTS: Record the approval flag and increment the counter
        EscrowStorage::set_signer_approved(&env, &escrow_id, &caller, &release_to);
        EscrowStorage::increment_approval_count(&env, &escrow_id, &release_to);

        // Also persist the approval record for audit trail
        let new_approval = ReleaseApproval {
            signer: caller.clone(),
            release_to: release_to.clone(),
            timestamp: env.ledger().timestamp(),
        };
        EscrowStorage::add_approval(&env, &escrow_id, new_approval);

        Ok(())
    }

    /// Release a partial amount from escrow to a recipient.
    /// Requires multi-sig approval (2-of-3) via approve_partial_release.
    ///
    /// CHECKS:
    /// - Escrow must exist and be Funded
    /// - Escrow must not be frozen
    /// - Amount must be positive and not exceed escrow balance
    /// - Recipient must be beneficiary or depositor
    /// - Reason must not be empty
    /// - Must have 2-of-3 approval
    ///
    /// EFFECTS:
    /// - Update escrow amount
    /// - Record release in history
    /// - Clear approvals after execution
    /// - Emit PartialRelease event
    ///
    /// INTERACTIONS:
    /// - Token transfer after all state updates
    pub fn release_escrow_partial(
        env: Env,
        escrow_id: BytesN<32>,
        amount: i128,
        recipient: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Check if escrow is frozen
        AccessControl::require_not_frozen(&escrow)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Validate amount
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if amount > escrow.amount {
            return Err(EscrowError::InsufficientFunds);
        }

        // Validate recipient
        if recipient != escrow.beneficiary && recipient != escrow.depositor {
            return Err(EscrowError::InvalidRelease);
        }

        // Validate reason
        if reason.is_empty() {
            return Err(EscrowError::EmptyReleaseReason);
        }

        // Check for 2-of-3 approval
        let approval_count =
            EscrowStorage::get_approval_count_for_target(&env, &escrow_id, &recipient);
        if approval_count < 2 {
            return Err(EscrowError::NotAuthorized);
        }

        // EFFECTS: Update escrow amount
        escrow.amount -= amount;
        EscrowStorage::save(&env, &escrow);

        // Record release in history
        let release_record = ReleaseRecord {
            escrow_id: escrow_id.clone(),
            amount,
            recipient: recipient.clone(),
            released_at: env.ledger().timestamp(),
            reason: reason.clone(),
        };
        EscrowStorage::add_release_record(&env, &escrow_id, release_record);

        // Clear approvals after execution
        EscrowStorage::clear_approvals(&env, &escrow_id);
        let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

        // INTERACTIONS: Token transfer
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Emit event
        events::partial_release(&env, escrow_id, amount, recipient);

        Ok(())
    }

    /// Release escrow with damage deduction.
    /// Deducts damage amount and releases the remainder to the depositor (guest).
    /// The damage amount goes to the beneficiary (landlord).
    /// Requires multi-sig approval (2-of-3).
    ///
    /// CHECKS:
    /// - Escrow must exist and be Funded
    /// - Escrow must not be frozen
    /// - Damage amount must be non-negative and not exceed escrow balance
    /// - Reason must not be empty
    /// - Must have 2-of-3 approval for release to depositor
    ///
    /// EFFECTS:
    /// - Update escrow status to Released
    /// - Record both releases in history
    /// - Clear approvals after execution
    /// - Emit DamageDeduction event
    ///
    /// INTERACTIONS:
    /// - Two token transfers after all state updates
    pub fn release_with_deduction(
        env: Env,
        escrow_id: BytesN<32>,
        damage_amount: i128,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Check if escrow is frozen
        AccessControl::require_not_frozen(&escrow)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Validate damage amount
        if damage_amount < 0 {
            return Err(EscrowError::InvalidAmount);
        }

        if damage_amount > escrow.amount {
            return Err(EscrowError::InsufficientFunds);
        }

        // Validate reason
        if reason.is_empty() {
            return Err(EscrowError::EmptyReleaseReason);
        }

        // Check for 2-of-3 approval for release to depositor
        let approval_count =
            EscrowStorage::get_approval_count_for_target(&env, &escrow_id, &escrow.depositor);
        if approval_count < 2 {
            return Err(EscrowError::NotAuthorized);
        }

        // Calculate refund amount
        let refund_amount = escrow.amount - damage_amount;

        // EFFECTS: Update escrow status (all funds will be released)
        escrow.status = EscrowStatus::Released;
        EscrowStorage::save(&env, &escrow);

        // Record damage deduction release in history
        if damage_amount > 0 {
            let damage_record = ReleaseRecord {
                escrow_id: escrow_id.clone(),
                amount: damage_amount,
                recipient: escrow.beneficiary.clone(),
                released_at: env.ledger().timestamp(),
                reason: reason.clone(),
            };
            EscrowStorage::add_release_record(&env, &escrow_id, damage_record);
        }

        // Record refund release in history
        if refund_amount > 0 {
            let refund_record = ReleaseRecord {
                escrow_id: escrow_id.clone(),
                amount: refund_amount,
                recipient: escrow.depositor.clone(),
                released_at: env.ledger().timestamp(),
                reason: soroban_sdk::String::from_str(&env, "Refund after damage deduction"),
            };
            EscrowStorage::add_release_record(&env, &escrow_id, refund_record);
        }

        // Clear approvals after execution
        EscrowStorage::clear_approvals(&env, &escrow_id);
        let targets = [escrow.beneficiary.clone(), escrow.depositor.clone()];
        let signers = [
            escrow.depositor.clone(),
            escrow.beneficiary.clone(),
            escrow.arbiter.clone(),
        ];
        EscrowStorage::clear_approval_counts(&env, &escrow_id, &targets, &signers);

        // INTERACTIONS: Token transfers
        let token_client = token::Client::new(&env, &escrow.token);

        // Transfer damage amount to landlord (beneficiary)
        if damage_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.beneficiary,
                &damage_amount,
            );
        }

        // Transfer refund to tenant (depositor)
        if refund_amount > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.depositor,
                &refund_amount,
            );
        }

        // Emit event
        events::damage_deduction(&env, escrow_id, damage_amount, refund_amount);

        Ok(())
    }

    /// Get release history for an escrow.
    /// Returns all partial releases that have been made.
    pub fn get_release_history(
        env: Env,
        escrow_id: BytesN<32>,
    ) -> Result<soroban_sdk::Vec<ReleaseRecord>, EscrowError> {
        // Verify escrow exists
        EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(EscrowStorage::get_release_history(&env, &escrow_id))
    }

    /// Initialize the system admin address.
    /// Should be called once during contract deployment.
    /// Only the initial caller can set the admin.
    ///
    /// CHECKS:
    /// - Admin must not already be set
    ///
    /// EFFECTS:
    /// - Set admin address in storage
    pub fn initialize_admin(env: Env, admin: Address) -> Result<(), EscrowError> {
        // Check if admin is already set
        if EscrowStorage::get_admin(&env).is_some() {
            return Err(EscrowError::NotAuthorized);
        }

        // Require authorization from the admin address
        admin.require_auth();

        // Set the admin
        EscrowStorage::set_admin(&env, &admin);

        Ok(())
    }

    /// Update the system admin address.
    /// Only the current admin can update to a new admin.
    ///
    /// CHECKS:
    /// - Caller must be current admin
    ///
    /// EFFECTS:
    /// - Update admin address in storage
    pub fn update_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), EscrowError> {
        // Verify caller is current admin
        AccessControl::is_system_admin(&env, &caller)?;

        // Require authorization
        caller.require_auth();

        // Update the admin
        EscrowStorage::set_admin(&env, &new_admin);

        Ok(())
    }

    /// Get the current system admin address.
    pub fn get_admin(env: Env) -> Option<Address> {
        EscrowStorage::get_admin(&env)
    }

    /// Freeze an escrow to prevent all fund movements.
    /// Used in case of verified exploit, major dispute, or security incident.
    /// Only the system admin or arbiter can freeze an escrow.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must not already be frozen
    /// - Caller must be system admin or arbiter
    /// - Reason must not be empty
    ///
    /// EFFECTS:
    /// - Set is_frozen flag to true
    /// - Record freeze timestamp and reason
    /// - Emit EscrowFrozen event
    pub fn freeze_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        reason: soroban_sdk::String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Check if already frozen
        if escrow.is_frozen {
            return Err(EscrowError::AlreadyFrozen);
        }

        // Verify reason is not empty
        if reason.is_empty() {
            return Err(EscrowError::EmptyFreezeReason);
        }

        // Verify caller is system admin or arbiter
        let is_admin = AccessControl::is_system_admin(&env, &caller).is_ok();
        let is_arbiter = AccessControl::is_arbiter(&escrow, &caller).is_ok();

        if !is_admin && !is_arbiter {
            return Err(EscrowError::NotAuthorized);
        }

        // Require authorization
        caller.require_auth();

        // EFFECTS: Freeze the escrow
        let timestamp = env.ledger().timestamp();
        escrow.is_frozen = true;
        escrow.frozen_at = Some(timestamp);
        escrow.freeze_reason = Some(reason.clone());

        EscrowStorage::save(&env, &escrow);

        // Emit event
        events::escrow_frozen(&env, escrow_id, caller, reason, timestamp);

        Ok(())
    }

    /// Unfreeze an escrow to allow fund movements again.
    /// Only the system admin can unfreeze an escrow.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be frozen
    /// - Caller must be system admin
    ///
    /// EFFECTS:
    /// - Set is_frozen flag to false
    /// - Clear freeze timestamp and reason
    /// - Emit EscrowUnfrozen event
    pub fn unfreeze_escrow(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Check if escrow is frozen
        if !escrow.is_frozen {
            return Err(EscrowError::NotFrozen);
        }

        // Verify caller is system admin
        AccessControl::is_system_admin(&env, &caller)?;

        // Require authorization
        caller.require_auth();

        // EFFECTS: Unfreeze the escrow
        let timestamp = env.ledger().timestamp();
        escrow.is_frozen = false;
        escrow.frozen_at = None;
        escrow.freeze_reason = None;

        EscrowStorage::save(&env, &escrow);

        // Emit event
        events::escrow_unfrozen(&env, escrow_id, caller, timestamp);

        Ok(())
    }

    /// Check if an escrow is frozen.
    /// Read-only view function.
    pub fn is_escrow_frozen(env: Env, escrow_id: BytesN<32>) -> Result<bool, EscrowError> {
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(escrow.is_frozen)
    }

    /// Release rent with automatic 90/5/5 fee split.
    ///
    /// Distributes the full escrow balance:
    ///   - beneficiary (landlord/admin): 90%
    ///   - platform_governance: 5%
    ///   - agent_referral: remainder (total - beneficiary_share - governance_share)
    ///
    /// Integer arithmetic using scale multiplication avoids rounding loss: the
    /// remainder is assigned to agent_referral so that all strokes sum to `amount`.
    ///
    /// CHECKS:
    /// - Escrow must exist and be in Funded state (not Disputed)
    /// - Caller must be the arbiter
    ///
    /// EFFECTS:
    /// - Escrow status → Released
    ///
    /// INTERACTIONS:
    /// - Three token transfers after all state updates
    pub fn release_rent(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), EscrowError> {
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        AccessControl::is_arbiter(&escrow, &caller)?;

        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        caller.require_auth();

        let total = escrow.amount;
        let beneficiary_share = total * 90 / 100;
        let governance_share = total * 5 / 100;
        let agent_share = total - beneficiary_share - governance_share;

        // EFFECTS: mark as released before any transfers (checks-effects-interactions)
        escrow.status = EscrowStatus::Released;
        EscrowStorage::save(&env, &escrow);

        // INTERACTIONS: distribute funds
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.beneficiary,
            &beneficiary_share,
        );
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.platform_governance,
            &governance_share,
        );
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.agent_referral,
            &agent_share,
        );

        events::rent_released(
            &env,
            escrow_id,
            beneficiary_share,
            governance_share,
            agent_share,
        );
        Ok(())
    }

    /// Withdraw safety deposit back to the depositor.
    ///
    /// Can only be called when:
    ///   1. The escrow timeout has elapsed (same timestamp logic as release_escrow_on_timeout)
    ///   2. No active dispute is registered (status must NOT be Disputed)
    ///
    /// CHECKS:
    /// - Escrow must exist and be in Funded state
    /// - Caller must be the depositor
    /// - Escrow must not be in Disputed state
    /// - Timeout must have passed (now > created_at + timeout_days * 86400)
    ///
    /// EFFECTS:
    /// - Escrow status → Refunded
    ///
    /// INTERACTIONS:
    /// - Token transfer after state update
    pub fn withdraw_safety_deposit(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
    ) -> Result<(), EscrowError> {
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        AccessControl::is_depositor(&escrow, &caller)?;

        if escrow.status == EscrowStatus::Disputed {
            return Err(EscrowError::DisputeActive);
        }

        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        caller.require_auth();

        let timeout_seconds = escrow.timeout_days.saturating_mul(86_400);
        let deadline = escrow.created_at.saturating_add(timeout_seconds);
        if env.ledger().timestamp() <= deadline {
            return Err(EscrowError::TimeoutNotReached);
        }

        // EFFECTS
        escrow.status = EscrowStatus::Refunded;
        EscrowStorage::save(&env, &escrow);

        // INTERACTIONS
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.depositor,
            &escrow.amount,
        );

        events::safety_deposit_withdrawn(&env, escrow_id, escrow.amount);
        Ok(())
    }

    // --- Upgrade Functions ---

    /// Propose a contract upgrade.
    pub fn propose_upgrade(
        env: Env,
        proposer: Address,
        proposal_id: String,
        wasm_hash: soroban_sdk::Bytes,
        notes: String,
        delay_seconds: u64,
    ) -> Result<(), EscrowError> {
        upgrade::propose_upgrade(&env, proposer, proposal_id, wasm_hash, notes, delay_seconds)
    }

    /// Approve an upgrade proposal.
    pub fn approve_upgrade(
        env: Env,
        approver: Address,
        proposal_id: String,
    ) -> Result<(), EscrowError> {
        upgrade::approve_upgrade(&env, approver, proposal_id)
    }

    /// Execute an approved upgrade.
    pub fn execute_upgrade(
        env: Env,
        executor: Address,
        proposal_id: String,
    ) -> Result<(), EscrowError> {
        upgrade::execute_upgrade(&env, executor, proposal_id)
    }

    /// Get an upgrade proposal.
    pub fn get_upgrade_proposal(
        env: Env,
        proposal_id: String,
    ) -> Result<upgrade::UpgradeProposal, EscrowError> {
        upgrade::get_upgrade_proposal(&env, proposal_id)
    }
}
