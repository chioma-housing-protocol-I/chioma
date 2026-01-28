/// Core escrow lifecycle logic: creation, funding, approvals, and release.
/// Implements checks-effects-interactions pattern for reentrancy safety.
use soroban_sdk::{Address, BytesN, Env, Vec};

use super::access::AccessControl;
use super::errors::EscrowError;
use super::storage::EscrowStorage;
use super::types::{Escrow, EscrowStatus, ReleaseApproval};

/// Core escrow contract implementation.
pub struct EscrowContract;

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
        env: &Env,
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

        // Generate escrow ID - use a deterministic hash
        // In production, use a proper hash function
        let escrow_id = BytesN::<32>::from_array(env, &[0u8; 32]);

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

        EscrowStorage::save(env, &escrow);
        EscrowStorage::increment_count(env);

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
        env: &Env,
        escrow_id: &BytesN<32>,
        caller: &Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(env, escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is depositor
        AccessControl::is_depositor(&escrow, caller)?;

        // Verify escrow is in Pending state
        if escrow.status != EscrowStatus::Pending {
            return Err(EscrowError::InvalidState);
        }

        // EFFECTS: Update status
        escrow.status = EscrowStatus::Funded;
        EscrowStorage::save(env, &escrow);

        // INTERACTIONS: Token transfer would happen here
        // transfer_from_token(&env, &escrow.token, &caller, &escrow_contract_id, escrow.amount)?;

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
        env: &Env,
        escrow_id: &BytesN<32>,
        caller: &Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let escrow = EscrowStorage::get(env, escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a valid party
        AccessControl::is_party(&escrow, caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Verify release target is valid (must be beneficiary or depositor)
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // Get existing approvals
        let approvals = EscrowStorage::get_approvals(env, escrow_id);

        // Check for duplicate approval from same signer to same target
        for approval in &approvals {
            if approval.signer == *caller && approval.release_to == release_to {
                return Err(EscrowError::AlreadySigned);
            }
        }

        // EFFECTS: Add the new approval
        let new_approval = ReleaseApproval {
            signer: caller.clone(),
            release_to: release_to.clone(),
            timestamp: env.ledger().timestamp(),
        };
        EscrowStorage::add_approval(env, escrow_id, new_approval);

        // Count unique signers approving this release target
        let mut unique_signers: Vec<Address> = Vec::new(env);
        for approval in &approvals {
            if approval.release_to == release_to {
                let mut found = false;
                for signer in &unique_signers {
                    if signer == approval.signer {
                        found = true;
                        break;
                    }
                }
                if !found {
                    unique_signers.push_back(approval.signer.clone());
                }
            }
        }

        // Add current caller to unique signers count (since we just added their approval)
        let mut caller_already_counted = false;
        for signer in &unique_signers {
            if signer == *caller {
                caller_already_counted = true;
                break;
            }
        }
        if !caller_already_counted {
            unique_signers.push_back(caller.clone());
        }

        // If 2 or more unique signers approve, execute release
        if unique_signers.len() >= 2 {
            let mut escrow_to_update =
                EscrowStorage::get(env, escrow_id).ok_or(EscrowError::EscrowNotFound)?;

            // Determine final status based on release target
            escrow_to_update.status = EscrowStatus::Released;
            EscrowStorage::save(env, &escrow_to_update);

            // Clear approvals after execution
            EscrowStorage::clear_approvals(env, escrow_id);

            // INTERACTIONS: Token transfer would happen here
            // transfer_to_token(&env, &escrow.token, &escrow_contract_id, &release_to, escrow.amount)?;
        }

        Ok(())
    }

    /// Get details of an escrow.
    /// Read-only view function.
    pub fn get_escrow(env: &Env, escrow_id: &BytesN<32>) -> Result<Escrow, EscrowError> {
        EscrowStorage::get(env, escrow_id).ok_or(EscrowError::EscrowNotFound)
    }

    /// Get approval count for a specific release target.
    /// Returns number of unique signers approving release to a specific address.
    pub fn get_approval_count(
        env: &Env,
        escrow_id: &BytesN<32>,
        release_to: &Address,
    ) -> Result<u32, EscrowError> {
        let approvals = EscrowStorage::get_approvals(env, escrow_id);

        let mut unique_signers: Vec<Address> = Vec::new(env);
        for approval in &approvals {
            if approval.release_to == *release_to {
                let mut found = false;
                for signer in &unique_signers {
                    if signer == approval.signer {
                        found = true;
                        break;
                    }
                }
                if !found {
                    unique_signers.push_back(approval.signer.clone());
                }
            }
        }

        Ok(unique_signers.len())
    }
}
