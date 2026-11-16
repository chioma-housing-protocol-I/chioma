//! Minimal generic timelock for sensitive admin operations (#2085).
//!
//! A reference implementation deliberately scoped smaller than
//! `chioma`'s timelock (`contracts/chioma/src/timelock.rs`, which has
//! per-action-type delays and a two-step admin-transfer flow): a single
//! fixed minimum delay for every action, queue/execute/cancel, admin-only
//! on both ends. `update_admin` and other existing synchronous admin
//! entrypoints are left as-is in this PR (changing them to go through
//! this timelock would be a breaking behavior change with its own test
//! fallout); this module makes a real, tested delay mechanism available
//! for new sensitive operations to opt into, and as the pattern to widen
//! `update_admin` into later.

use crate::errors::EscrowError;
use crate::events;
use crate::types::DataKey;
use soroban_sdk::{contracttype, Address, Bytes, Env, String, Vec};

/// Minimum delay (seconds) every queued action must respect. 24 hours,
/// matching the shortest delay tier in chioma's timelock (`MIN_DELAY_PAUSE`).
pub const MIN_DELAY_SECONDS: u64 = 24 * 60 * 60;

#[derive(Clone)]
#[contracttype]
pub struct TimelockAction {
    pub id: String,
    pub target: Address,
    pub data: Bytes,
    pub eta: u64,
    pub executed: bool,
    pub cancelled: bool,
}

fn require_admin(env: &Env, caller: &Address) -> Result<(), EscrowError> {
    let admin = crate::storage::EscrowStorage::get_admin(env).ok_or(EscrowError::AdminNotSet)?;
    if admin != *caller {
        return Err(EscrowError::NotAuthorized);
    }
    Ok(())
}

/// Queue a sensitive operation with a mandatory minimum delay.
/// Only the system admin may queue. Returns nothing; the action is looked
/// up later by `action_id`, which the caller chooses and must be unique.
pub fn queue_action(
    env: &Env,
    caller: Address,
    action_id: String,
    target: Address,
    data: Bytes,
    delay_seconds: u64,
) -> Result<(), EscrowError> {
    caller.require_auth();
    require_admin(env, &caller)?;

    if delay_seconds < MIN_DELAY_SECONDS {
        return Err(EscrowError::TimelockEtaNotReached);
    }

    if env
        .storage()
        .persistent()
        .has(&DataKey::TimelockAction(action_id.clone()))
    {
        return Err(EscrowError::InvalidState);
    }

    let eta = env.ledger().timestamp() + delay_seconds;
    let action = TimelockAction {
        id: action_id.clone(),
        target,
        data,
        eta,
        executed: false,
        cancelled: false,
    };

    env.storage()
        .persistent()
        .set(&DataKey::TimelockAction(action_id.clone()), &action);
    env.storage().persistent().extend_ttl(
        &DataKey::TimelockAction(action_id.clone()),
        500000,
        500000,
    );

    let mut active: Vec<String> = env
        .storage()
        .instance()
        .get(&DataKey::ActiveTimelockActions)
        .unwrap_or(Vec::new(env));
    active.push_back(action_id.clone());
    env.storage()
        .instance()
        .set(&DataKey::ActiveTimelockActions, &active);

    events::timelock_action_queued(env, action_id, eta);

    Ok(())
}

/// Execute a queued action once its ETA has passed. Any caller may
/// trigger execution (the admin gate already happened at queue time);
/// this function only marks the action executed and emits an event, it
/// does not itself perform `target`/`data` — the caller applying this
/// action is responsible for interpreting them, mirroring how chioma's
/// timelock separates "the delay was respected" from "what the action
/// actually does."
pub fn execute_action(env: &Env, caller: Address, action_id: String) -> Result<(), EscrowError> {
    caller.require_auth();

    let mut action: TimelockAction = env
        .storage()
        .persistent()
        .get(&DataKey::TimelockAction(action_id.clone()))
        .ok_or(EscrowError::TimelockActionNotFound)?;

    if action.executed {
        return Err(EscrowError::TimelockAlreadyExecuted);
    }
    if action.cancelled {
        return Err(EscrowError::TimelockAlreadyCancelled);
    }
    if env.ledger().timestamp() < action.eta {
        return Err(EscrowError::TimelockEtaNotReached);
    }

    action.executed = true;
    env.storage()
        .persistent()
        .set(&DataKey::TimelockAction(action_id.clone()), &action);
    remove_from_active(env, &action_id);

    events::timelock_action_executed(env, action_id);

    Ok(())
}

/// Cancel a queued action before it executes. Only the admin may cancel.
pub fn cancel_action(env: &Env, caller: Address, action_id: String) -> Result<(), EscrowError> {
    caller.require_auth();
    require_admin(env, &caller)?;

    let mut action: TimelockAction = env
        .storage()
        .persistent()
        .get(&DataKey::TimelockAction(action_id.clone()))
        .ok_or(EscrowError::TimelockActionNotFound)?;

    if action.executed {
        return Err(EscrowError::TimelockAlreadyExecuted);
    }
    if action.cancelled {
        return Err(EscrowError::TimelockAlreadyCancelled);
    }

    action.cancelled = true;
    env.storage()
        .persistent()
        .set(&DataKey::TimelockAction(action_id.clone()), &action);
    remove_from_active(env, &action_id);

    events::timelock_action_cancelled(env, action_id);

    Ok(())
}

pub fn get_action(env: &Env, action_id: String) -> Result<TimelockAction, EscrowError> {
    env.storage()
        .persistent()
        .get(&DataKey::TimelockAction(action_id))
        .ok_or(EscrowError::TimelockActionNotFound)
}

pub fn get_active_actions(env: &Env) -> Vec<String> {
    env.storage()
        .instance()
        .get(&DataKey::ActiveTimelockActions)
        .unwrap_or(Vec::new(env))
}

fn remove_from_active(env: &Env, action_id: &String) {
    let active: Vec<String> = env
        .storage()
        .instance()
        .get(&DataKey::ActiveTimelockActions)
        .unwrap_or(Vec::new(env));

    let mut remaining = Vec::new(env);
    for id in active.iter() {
        if &id != action_id {
            remaining.push_back(id);
        }
    }
    env.storage()
        .instance()
        .set(&DataKey::ActiveTimelockActions, &remaining);
}
