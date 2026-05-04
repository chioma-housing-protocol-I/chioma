use soroban_sdk::{Address, Bytes, Env, String, Vec};
use crate::errors::ContractError;
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

/// Propose a contract upgrade (admin only)
pub fn propose_upgrade(
    env: &Env,
    proposer: Address,
    proposal_id: String,
    wasm_hash: Bytes,
    notes: String,
    delay_seconds: u64,
) -> Result<(), ContractError> {
    proposer.require_auth();
    
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::AdminNotConfigured)?;
    
    if proposer != admin {
        return Err(ContractError::UnauthorizedAdmin);
    }

    if env
        .storage()
        .persistent()
        .has(&DataKey::UpgradeProposal(proposal_id.clone()))
    {
        return Err(ContractError::AccessDenied);
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

/// Approve an upgrade proposal (admin only)
pub fn approve_upgrade(
    env: &Env,
    approver: Address,
    proposal_id: String,
) -> Result<(), ContractError> {
    approver.require_auth();
    
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::AdminNotConfigured)?;
    
    if approver != admin {
        return Err(ContractError::UnauthorizedAdmin);
    }

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(ContractError::AccessDenied)?;

    if proposal.executed {
        return Err(ContractError::AccessDenied);
    }

    proposal.approvals.push_back(approver);
    env.storage()
        .persistent()
        .set(&DataKey::UpgradeProposal(proposal_id.clone()), &proposal);

    Ok(())
}

/// Execute an approved upgrade (admin only)
pub fn execute_upgrade(
    env: &Env,
    executor: Address,
    proposal_id: String,
) -> Result<(), ContractError> {
    executor.require_auth();
    
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::AdminNotConfigured)?;
    
    if executor != admin {
        return Err(ContractError::UnauthorizedAdmin);
    }

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(ContractError::AccessDenied)?;

    if proposal.executed {
        return Err(ContractError::AccessDenied);
    }

    if env.ledger().timestamp() < proposal.eta {
        return Err(ContractError::AccessDenied);
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
) -> Result<UpgradeProposal, ContractError> {
    env.storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id))
        .ok_or(ContractError::AccessDenied)
}
