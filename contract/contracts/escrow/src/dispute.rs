//! Dispute resolution and admin override for the Escrow contract.
//! Allows either party to freeze funds and requires admin to resolve.
use soroban_sdk::{token, Address, BytesN, Env, String};

use crate::access::AccessControl;
use crate::errors::EscrowError;
use crate::events;
use crate::storage::EscrowStorage;
use crate::types::EscrowStatus;

/// Dispute handling and resolution.
pub struct DisputeHandler;

impl DisputeHandler {
    /// Initiate a dispute on an escrow.
    /// Either depositor or beneficiary can call this.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Funded state
    /// - Caller must be depositor or beneficiary
    /// - Dispute reason must not be empty
    ///
    /// EFFECTS:
    /// - Update escrow status to Disputed
    /// - Store dispute reason
    /// - Clear existing approvals (freeze funds)
    pub fn initiate_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        reason: String,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is a primary party (depositor or beneficiary)
        AccessControl::is_primary_party(&escrow, &caller)?;

        // Verify escrow is in Funded state
        if escrow.status != EscrowStatus::Funded {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the dispute initiation
        caller.require_auth();

        // Verify reason is not empty
        if reason.is_empty() {
            return Err(EscrowError::EmptyDisputeReason);
        }

        // EFFECTS: Update status and store reason
        escrow.status = EscrowStatus::Disputed;
        escrow.disputed_at = Some(env.ledger().timestamp());
        escrow.dispute_reason = Some(reason);
        EscrowStorage::save(&env, &escrow);

        // Freeze funds by clearing all approvals
        EscrowStorage::clear_approvals(&env, &escrow_id);

        Ok(())
    }

    /// Resolve a dispute (admin only).
    /// Admin can release funds to either party or refund to depositor.
    ///
    /// CHECKS:
    /// - Escrow must exist
    /// - Escrow must be in Disputed state
    /// - Caller must be arbiter
    /// - Release target must be beneficiary or depositor
    ///
    /// EFFECTS:
    /// - Update escrow status to Released or Refunded
    /// - Clear dispute reason
    /// - Clear approvals
    ///
    /// INTERACTIONS:
    /// - Token transfer would happen after state update
    pub fn resolve_dispute(
        env: Env,
        escrow_id: BytesN<32>,
        caller: Address,
        release_to: Address,
    ) -> Result<(), EscrowError> {
        // CHECKS: Get and validate escrow
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        // Verify caller is arbiter
        AccessControl::is_arbiter(&escrow, &caller)?;

        // Verify escrow is in Disputed state
        if escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::InvalidState);
        }

        // Authorize the dispute resolution
        caller.require_auth();

        // Verify release target is valid
        if release_to != escrow.beneficiary && release_to != escrow.depositor {
            return Err(EscrowError::InvalidApprovalTarget);
        }

        // EFFECTS: Update status and clear dispute
        escrow.status = EscrowStatus::Released;
        escrow.disputed_at = None;
        escrow.dispute_reason = None;
        EscrowStorage::save(&env, &escrow);

        // Clear approvals
        EscrowStorage::clear_approvals(&env, &escrow_id);

        // INTERACTIONS: Token transfer from escrow contract to release target
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &release_to, &escrow.amount);

        Ok(())
    }

    /// Get dispute information for an escrow.
    /// Returns the dispute reason if escrow is disputed, None otherwise.
    pub fn get_dispute_info(
        env: Env,
        escrow_id: BytesN<32>,
    ) -> Result<Option<String>, EscrowError> {
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        Ok(escrow.dispute_reason)
    }

    /// Check if an escrow is currently disputed.
    pub fn is_disputed(env: Env, escrow_id: BytesN<32>) -> Result<bool, EscrowError> {
        let escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;
        Ok(escrow.status == EscrowStatus::Disputed)
    }

    /// Resolve a disputed escrow automatically when dispute timeout is reached.
    /// On timeout, funds are refunded to depositor.
    pub fn resolve_dispute_on_timeout(env: Env, escrow_id: BytesN<32>) -> Result<(), EscrowError> {
        let mut escrow = EscrowStorage::get(&env, &escrow_id).ok_or(EscrowError::EscrowNotFound)?;

        if escrow.status != EscrowStatus::Disputed {
            return Err(EscrowError::InvalidState);
        }

        let disputed_at = escrow.disputed_at.unwrap_or(escrow.created_at);
        let timeout_days = EscrowStorage::get_timeout_config(&env).dispute_timeout_days;
        let timeout_seconds = timeout_days.saturating_mul(86_400);
        let deadline = disputed_at.saturating_add(timeout_seconds);
        let now = env.ledger().timestamp();
        if now <= deadline {
            return Err(EscrowError::TimeoutNotReached);
        }

        escrow.status = EscrowStatus::Refunded;
        escrow.disputed_at = None;
        escrow.dispute_reason = None;
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

        events::dispute_timeout(&env, escrow_id);
        Ok(())
    }
}
