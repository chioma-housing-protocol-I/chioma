//! Contract admin and global pause for the Payment contract (#1689).
//!
//! Payment had no access-control concept before this: every entry point
//! only required its own caller's auth, with no admin gate anywhere. This
//! module adds the minimal admin primitive needed to authorize a contract-
//! wide emergency pause, mirroring escrow's SystemAdmin / pause shape
//! (`contracts/escrow/src/access.rs`, `escrow_impl.rs`) rather than
//! inventing a new pattern.

use soroban_sdk::{Address, Env};

use crate::errors::PaymentError as Error;
use crate::events;
use crate::storage::DataKey;

/// Get the contract admin address.
pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

/// Set the contract admin address.
fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Verify caller is the contract admin.
pub fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    let admin = get_admin(env).ok_or(Error::AdminNotSet)?;
    if admin == *caller {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

/// Initialize the contract admin. Callable once; only the given address
/// can set itself as admin (requires its own auth).
///
/// # Errors
/// - `AdminAlreadySet` if an admin has already been configured.
pub fn initialize_admin(env: Env, admin: Address) -> Result<(), Error> {
    if get_admin(&env).is_some() {
        return Err(Error::AdminAlreadySet);
    }

    admin.require_auth();
    set_admin(&env, &admin);

    events::admin_initialized(&env, admin);
    Ok(())
}

/// Whether the contract is globally paused.
/// Defaults to `false` (not paused) when never explicitly set.
pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

/// Verify the contract is not globally paused.
/// State-changing entry points should check this before proceeding; reads
/// remain available while paused.
pub fn require_not_paused(env: &Env) -> Result<(), Error> {
    if is_paused(env) {
        Err(Error::ContractPaused)
    } else {
        Ok(())
    }
}

/// Pause the contract, blocking all state-changing entry points.
/// Reads remain available. Only the admin may pause.
///
/// # Errors
/// - `AdminNotSet` / `Unauthorized` if caller is not the admin.
/// - `ContractPaused` if the contract is already paused.
pub fn pause(env: Env, caller: Address) -> Result<(), Error> {
    require_admin(&env, &caller)?;
    caller.require_auth();

    if is_paused(&env) {
        return Err(Error::ContractPaused);
    }

    env.storage().instance().set(&DataKey::Paused, &true);
    events::contract_paused(&env, caller);
    Ok(())
}

/// Unpause the contract, restoring state-changing entry points.
/// Only the admin may unpause.
///
/// # Errors
/// - `AdminNotSet` / `Unauthorized` if caller is not the admin.
/// - `NotPaused` if the contract is not currently paused.
pub fn unpause(env: Env, caller: Address) -> Result<(), Error> {
    require_admin(&env, &caller)?;
    caller.require_auth();

    if !is_paused(&env) {
        return Err(Error::NotPaused);
    }

    env.storage().instance().set(&DataKey::Paused, &false);
    events::contract_unpaused(&env, caller);
    Ok(())
}
