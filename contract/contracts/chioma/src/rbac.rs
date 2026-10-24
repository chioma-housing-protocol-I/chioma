//! Manager role (#2086).
//!
//! The contract already has two admin concepts: a single `ContractState.admin`
//! (checked via `admin.require_auth()` directly by most admin-gated
//! functions) and a separate multi-sig admin set (`multi_sig.rs`, used for
//! governance proposals like adding/removing admins). This module adds a
//! third, strictly narrower tier: managers.
//!
//! A manager can call `Contract::pause` in addition to the contract admin,
//! so an incident can be responded to without waiting on a single key's
//! availability. A manager cannot `unpause`, cannot grant or revoke other
//! managers, and has no authority over anything else in the contract —
//! every other admin-gated function (config, rates, admin management,
//! upgrades, fund movement) is deliberately untouched by this module and
//! continues to require the contract admin exactly as before.
//!
//! Only the contract admin may grant or revoke manager status.

use soroban_sdk::{Address, Env};

use crate::errors::RentalError;
use crate::storage::DataKey;
use crate::types::ContractState;

const TTL_THRESHOLD: u32 = 500_000;
const TTL_BUMP: u32 = 500_000;

/// Grant manager status to `manager`. Admin only.
pub fn grant_manager(
    env: &Env,
    state: &ContractState,
    manager: Address,
) -> Result<(), RentalError> {
    state.admin.require_auth();

    env.storage()
        .persistent()
        .set(&DataKey::Manager(manager.clone()), &true);
    env.storage()
        .persistent()
        .extend_ttl(&DataKey::Manager(manager), TTL_THRESHOLD, TTL_BUMP);

    Ok(())
}

/// Revoke manager status from `manager`. Admin only. A no-op (not an
/// error) if the address was never a manager, matching `multi_sig`'s
/// idempotent-remove convention elsewhere in this contract.
pub fn revoke_manager(
    env: &Env,
    state: &ContractState,
    manager: Address,
) -> Result<(), RentalError> {
    state.admin.require_auth();

    env.storage()
        .persistent()
        .remove(&DataKey::Manager(manager));

    Ok(())
}

/// Whether `address` currently holds manager status.
pub fn is_manager(env: &Env, address: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Manager(address.clone()))
        .unwrap_or(false)
}

/// Require that `caller` is either the contract admin or a manager, and
/// that `caller` has actually authorized this call. Used by `pause()` in
/// place of a bare `state.admin.require_auth()` so either role can trigger
/// it, while every other admin-gated function in the contract is
/// unaffected and keeps calling `state.admin.require_auth()` directly.
pub fn require_admin_or_manager(
    env: &Env,
    state: &ContractState,
    caller: &Address,
) -> Result<(), RentalError> {
    caller.require_auth();

    if caller == &state.admin || is_manager(env, caller) {
        Ok(())
    } else {
        Err(RentalError::InsufficientPermissions)
    }
}
