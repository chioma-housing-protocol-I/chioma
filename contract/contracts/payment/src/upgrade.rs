use soroban_sdk::{Address, Bytes, Env, String, Vec};
use crate::errors::PaymentError;
use crate::storage::DataKey;

/// Contract upgrade proposal
#[derive(Clone)]
#[soroban_sdk::contracttype]
pub struct UpgradeProposal {
    pub id: String,
    pub proposer: Address,
    pub wasm_hash: Bytes,
    pub approvals: Vec<Address>,
    pub required_signatures: u32,
    pub eta: u64,
    pub executed: bool,
    pub notes: String,
    pub created_at: u64,
}

/// Propose a contract upgrade (requires authorization)
pub fn propose_upgrade(
    env: &Env,
    proposer: Address,
    proposal_id: String,
    wasm_hash: Bytes,
    notes: String,
    delay_seconds: u64,
) -> Result<(), PaymentError> {
    proposer.require_auth();

    if env
        .storage()
        .persistent()
        .has(&DataKey::UpgradeProposal(proposal_id.clone()))
    {
        return Err(PaymentError::PaymentFailed);
    }

    let mut approvals = Vec::new(env);
    approvals.push_back(proposer.clone());

    let proposal = UpgradeProposal {
        id: proposal_id.clone(),
        proposer,
        wasm_hash,
        approvals,
        required_signatures: 1,
        eta: env.ledger().timestamp() + delay_seconds,
        executed: false,
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

    Ok(())
}

/// Approve an upgrade proposal
pub fn approve_upgrade(
    env: &Env,
    approver: Address,
    proposal_id: String,
) -> Result<(), PaymentError> {
    approver.require_auth();

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(PaymentError::PaymentNotFound)?;

    if proposal.executed {
        return Err(PaymentError::PaymentFailed);
    }

    proposal.approvals.push_back(approver);
    env.storage()
        .persistent()
        .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);

    Ok(())
}

/// Execute an approved upgrade
pub fn execute_upgrade(
    env: &Env,
    executor: Address,
    proposal_id: String,
) -> Result<(), PaymentError> {
    executor.require_auth();

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(PaymentError::PaymentNotFound)?;

    if proposal.executed {
        return Err(PaymentError::PaymentFailed);
    }

    if env.ledger().timestamp() < proposal.eta {
        return Err(PaymentError::PaymentNotDue);
    }

    proposal.executed = true;
    env.storage()
        .persistent()
        .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);

    Ok(())
}

/// Get an upgrade proposal
pub fn get_upgrade_proposal(
    env: &Env,
    proposal_id: String,
) -> Result<UpgradeProposal, PaymentError> {
    env.storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id))
        .ok_or(PaymentError::PaymentNotFound)
}
