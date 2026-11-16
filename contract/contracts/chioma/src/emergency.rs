//! Emergency withdrawal (#2087).
//!
//! In case of an exploit, a contract admin needs a way to pull a token's
//! balance out of the contract to a safe address before an attacker can
//! drain it further. This cannot be a single-admin action: a compromised
//! or malicious single key could otherwise empty the contract itself, so
//! it is gated behind the same multi-sig approval flow already used for
//! other admin governance actions (`multi_sig.rs`).
//!
//! Flow:
//! 1. `propose_emergency_withdrawal` — any admin proposes a withdrawal of
//!    `amount` of `token` to `recipient`. Creates a multi-sig `AdminProposal`
//!    (`ActionType::EmergencyAction`) and a parallel `EmergencyWithdrawalRequest`
//!    carrying the typed withdrawal details, linked by the same proposal id.
//! 2. `approve_emergency_withdrawal` — other admins approve, reusing
//!    `multi_sig::approve_action` exactly as any other proposal would be.
//! 3. `execute_emergency_withdrawal` — once `required_signatures` approvals
//!    are reached, any admin executes: this validates the proposal (not
//!    already executed, not expired, correctly typed, enough approvals),
//!    marks it executed via `multi_sig::execute_action`, then performs the
//!    actual token transfer. The transfer happens in this function, not in
//!    the generic `multi_sig::execute_action`, since that function (by
//!    design, matching every other proposal type) only marks a proposal
//!    executed and never itself performs side effects.

use soroban_sdk::{Address, Env, String};

use crate::{
    errors::RentalError,
    events, multi_sig,
    storage::DataKey,
    types::{ActionType, AdminProposal, EmergencyWithdrawalRequest},
};

const TTL_THRESHOLD: u32 = 500_000;
const TTL_BUMP: u32 = 500_000;

/// Propose an emergency withdrawal of `amount` of `token` to `recipient`.
/// Admin only (enforced by `multi_sig::propose_action`). Counts as the
/// proposer's own approval, same as any other multi-sig proposal.
pub fn propose_emergency_withdrawal(
    env: &Env,
    proposer: Address,
    token: Address,
    amount: i128,
    recipient: Address,
) -> Result<String, RentalError> {
    if amount <= 0 {
        return Err(RentalError::InvalidAmount);
    }

    let proposal_id = multi_sig::propose_action(
        env,
        proposer,
        ActionType::EmergencyAction,
        Some(recipient.clone()),
        soroban_sdk::Bytes::new(env),
    )?;

    let request = EmergencyWithdrawalRequest {
        proposal_id: proposal_id.clone(),
        token,
        amount,
        recipient,
        executed: false,
    };
    env.storage()
        .persistent()
        .set(&DataKey::EmergencyWithdrawal(proposal_id.clone()), &request);
    env.storage().persistent().extend_ttl(
        &DataKey::EmergencyWithdrawal(proposal_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    Ok(proposal_id)
}

/// Approve a pending emergency withdrawal proposal. Admin only, one
/// approval per admin, same rules as `multi_sig::approve_action` generally.
pub fn approve_emergency_withdrawal(
    env: &Env,
    approver: Address,
    proposal_id: String,
) -> Result<(), RentalError> {
    multi_sig::approve_action(env, approver, proposal_id)
}

/// Execute an emergency withdrawal once it has enough approvals. Admin
/// only. Transfers `amount` of `token` from the contract to `recipient`
/// and marks both the underlying proposal and this withdrawal request
/// executed.
pub fn execute_emergency_withdrawal(
    env: &Env,
    executor: Address,
    proposal_id: String,
) -> Result<(), RentalError> {
    let proposal: AdminProposal = env
        .storage()
        .persistent()
        .get(&DataKey::AdminProposal(proposal_id.clone()))
        .ok_or(RentalError::ProposalNotFound)?;

    // No dedicated error variant is available (#contracterror caps
    // RentalError at 50 variants, already reached) — InvalidTransition is
    // the closest existing fit for "this proposal cannot be executed as an
    // emergency withdrawal."
    if proposal.action_type != ActionType::EmergencyAction {
        return Err(RentalError::InvalidTransition);
    }

    let mut request: EmergencyWithdrawalRequest = env
        .storage()
        .persistent()
        .get(&DataKey::EmergencyWithdrawal(proposal_id.clone()))
        .ok_or(RentalError::ProposalNotFound)?;

    if request.executed {
        return Err(RentalError::ProposalAlreadyExecuted);
    }

    // Checked before multi_sig::execute_action marks the proposal executed
    // below: an insufficient-balance failure must not leave the proposal
    // permanently marked executed with no transfer having happened, since
    // that would be a stuck, un-retryable state.
    let contract_addr = env.current_contract_address();
    let token_client = soroban_sdk::token::Client::new(env, &request.token);
    let balance = token_client.balance(&contract_addr);
    if balance < request.amount {
        // Closest existing fit: this contract already uses
        // EscrowInsufficientFunds for "not enough of this token held by
        // the contract to cover the requested amount."
        return Err(RentalError::EscrowInsufficientFunds);
    }

    // Validates auth, admin status, not-already-executed, not-expired, and
    // sufficient approvals, then marks the underlying proposal executed.
    multi_sig::execute_action(env, executor, proposal_id.clone())?;

    token_client.transfer(&contract_addr, &request.recipient, &request.amount);

    request.executed = true;
    env.storage()
        .persistent()
        .set(&DataKey::EmergencyWithdrawal(proposal_id.clone()), &request);

    events::emergency_withdrawal_executed(
        env,
        proposal_id,
        request.token,
        request.amount,
        request.recipient,
    );

    Ok(())
}

/// Get an emergency withdrawal request by its proposal id.
pub fn get_emergency_withdrawal(
    env: &Env,
    proposal_id: String,
) -> Result<EmergencyWithdrawalRequest, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::EmergencyWithdrawal(proposal_id))
        .ok_or(RentalError::ProposalNotFound)
}
