//! Core escrow lifecycle logic: creation, funding, approvals, and release.
//! Implements checks-effects-interactions pattern for reentrancy safety.
use soroban_sdk::{contract, contractimpl, token, xdr::ToXdr, Address, BytesN, Env};

use crate::dispute::DisputeHandler;

use crate::access::AccessControl;
use crate::errors::EscrowError;
use crate::storage::EscrowStorage;
use crate::types::{Escrow, EscrowStatus, ReleaseApproval};

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
        amount: i128,
        token: Address,
    ) -> Result<BytesN<32>, EscrowError> {
        // CHECKS: Validate inputs
        if amount <= 0 {
            return Err(EscrowError::InsufficientFunds);
        }

        // Ensure all parties are distinct
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
            amount,
            token,
            status: EscrowStatus::Pending,
            created_at: env.ledger().timestamp(),
            dispute_reason: None,
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
}
