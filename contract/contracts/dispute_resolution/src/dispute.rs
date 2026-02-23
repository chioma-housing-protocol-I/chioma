use soroban_sdk::{Address, Env, String};

use crate::errors::DisputeError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{Arbiter, ContractState, Dispute, DisputeOutcome, Vote};

pub fn add_arbiter(env: &Env, admin: Address, arbiter: Address) -> Result<(), DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    admin.require_auth();

    if admin != state.admin {
        return Err(DisputeError::Unauthorized);
    }

    let key = DataKey::Arbiter(arbiter.clone());
    if env.storage().persistent().has(&key) {
        return Err(DisputeError::ArbiterAlreadyExists);
    }

    let arbiter_info = Arbiter {
        address: arbiter.clone(),
        added_at: env.ledger().timestamp(),
        active: true,
    };

    env.storage().persistent().set(&key, &arbiter_info);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    let count_key = DataKey::ArbiterCount;
    let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
    env.storage().persistent().set(&count_key, &(count + 1));
    env.storage()
        .persistent()
        .extend_ttl(&count_key, 500000, 500000);

    events::arbiter_added(env, admin, arbiter);

    Ok(())
}

pub fn raise_dispute(
    env: &Env,
    agreement_id: String,
    details_hash: String,
) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    if details_hash.is_empty() {
        return Err(DisputeError::InvalidDetailsHash);
    }

    let key = DataKey::Dispute(agreement_id.clone());
    if env.storage().persistent().has(&key) {
        return Err(DisputeError::DisputeAlreadyExists);
    }

    let dispute = Dispute {
        agreement_id: agreement_id.clone(),
        details_hash: details_hash.clone(),
        raised_at: env.ledger().timestamp(),
        resolved: false,
        resolved_at: None,
        votes_favor_landlord: 0,
        votes_favor_tenant: 0,
    };

    env.storage().persistent().set(&key, &dispute);
    env.storage().persistent().extend_ttl(&key, 500000, 500000);

    events::dispute_raised(env, agreement_id, details_hash);

    Ok(())
}

pub fn vote_on_dispute(
    env: &Env,
    arbiter: Address,
    agreement_id: String,
    favor_landlord: bool,
) -> Result<(), DisputeError> {
    if !env.storage().persistent().has(&DataKey::Initialized) {
        return Err(DisputeError::NotInitialized);
    }

    arbiter.require_auth();

    let arbiter_key = DataKey::Arbiter(arbiter.clone());
    let arbiter_info: Arbiter = env
        .storage()
        .persistent()
        .get(&arbiter_key)
        .ok_or(DisputeError::ArbiterNotFound)?;

    if !arbiter_info.active {
        return Err(DisputeError::ArbiterNotFound);
    }

    let dispute_key = DataKey::Dispute(agreement_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let vote_key = DataKey::Vote(agreement_id.clone(), arbiter.clone());
    if env.storage().persistent().has(&vote_key) {
        return Err(DisputeError::AlreadyVoted);
    }

    let vote = Vote {
        arbiter: arbiter.clone(),
        agreement_id: agreement_id.clone(),
        favor_landlord,
        voted_at: env.ledger().timestamp(),
    };

    env.storage().persistent().set(&vote_key, &vote);
    env.storage()
        .persistent()
        .extend_ttl(&vote_key, 500000, 500000);

    if favor_landlord {
        dispute.votes_favor_landlord += 1;
    } else {
        dispute.votes_favor_tenant += 1;
    }

    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    events::vote_cast(env, agreement_id, arbiter, favor_landlord);

    Ok(())
}

pub fn resolve_dispute(env: &Env, agreement_id: String) -> Result<DisputeOutcome, DisputeError> {
    let state: ContractState = env
        .storage()
        .instance()
        .get(&DataKey::State)
        .ok_or(DisputeError::NotInitialized)?;

    let dispute_key = DataKey::Dispute(agreement_id.clone());
    let mut dispute: Dispute = env
        .storage()
        .persistent()
        .get(&dispute_key)
        .ok_or(DisputeError::DisputeNotFound)?;

    if dispute.resolved {
        return Err(DisputeError::DisputeAlreadyResolved);
    }

    let total_votes = dispute.votes_favor_landlord + dispute.votes_favor_tenant;

    if total_votes < state.min_votes_required {
        return Err(DisputeError::InsufficientVotes);
    }

    dispute.resolved = true;
    dispute.resolved_at = Some(env.ledger().timestamp());

    env.storage().persistent().set(&dispute_key, &dispute);
    env.storage()
        .persistent()
        .extend_ttl(&dispute_key, 500000, 500000);

    let outcome = if dispute.votes_favor_landlord > dispute.votes_favor_tenant {
        DisputeOutcome::FavorLandlord
    } else {
        DisputeOutcome::FavorTenant
    };

    events::dispute_resolved(
        env,
        agreement_id,
        outcome.clone(),
        dispute.votes_favor_landlord,
        dispute.votes_favor_tenant,
    );

    Ok(outcome)
}

pub fn get_dispute(env: &Env, agreement_id: String) -> Option<Dispute> {
    let key = DataKey::Dispute(agreement_id);
    env.storage().persistent().get(&key)
}

pub fn get_arbiter(env: &Env, arbiter: Address) -> Option<Arbiter> {
    let key = DataKey::Arbiter(arbiter);
    env.storage().persistent().get(&key)
}

pub fn get_arbiter_count(env: &Env) -> u32 {
    let key = DataKey::ArbiterCount;
    env.storage().persistent().get(&key).unwrap_or(0)
}

pub fn get_vote(env: &Env, agreement_id: String, arbiter: Address) -> Option<Vote> {
    let key = DataKey::Vote(agreement_id, arbiter);
    env.storage().persistent().get(&key)
}
