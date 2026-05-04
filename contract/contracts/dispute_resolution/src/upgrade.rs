use soroban_sdk::{Address, Bytes, Env, String, Vec};
use crate::errors::DisputeError;
use crate::storage::DataKey;
use crate::types::ContractState;

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
) -> Result<(), DisputeError> {
    proposer.require_auth();
    
    let state = env
        .storage()
        .instance()
        .get::<DataKey, ContractState>(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;
    
    if proposer != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    if env
        .storage()
        .persistent()
        .has(&DataKey::UpgradeProposal(proposal_id.clone()))
    {
        return Err(DisputeError::AlreadyInitialized);
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
) -> Result<(), DisputeError> {
    approver.require_auth();
    
    let state = env
        .storage()
        .instance()
        .get::<DataKey, ContractState>(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;
    
    if approver != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(DisputeError::NotInitialized)?;

    if proposal.executed {
        return Err(DisputeError::AlreadyInitialized);
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
) -> Result<(), DisputeError> {
    executor.require_auth();
    
    let state = env
        .storage()
        .instance()
        .get::<DataKey, ContractState>(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;
    
    if executor != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    let mut proposal: UpgradeProposal = env
        .storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id.clone()))
        .ok_or(DisputeError::NotInitialized)?;

    if proposal.executed {
        return Err(DisputeError::AlreadyInitialized);
    }

    if env.ledger().timestamp() < proposal.eta {
        return Err(DisputeError::TimeoutNotReached);
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
) -> Result<UpgradeProposal, DisputeError> {
    env.storage()
        .persistent()
        .get(&DataKey::UpgradeProposal(proposal_id))
        .ok_or(DisputeError::NotInitialized)
}
