#![no_std]

//! User Profile Contract
//!
//! ## Public surface
//!
//! Unlike most contracts in this workspace, the `#[contract]` struct and its
//! `#[contractimpl]` block are **not** in this file — they live in
//! [`profile`], re-exported below via `pub use profile::*`. See
//! `profile.rs` for the full list of external entry points (initialize,
//! create_profile, update_profile, verify_profile, unverify_profile,
//! delete_profile, propose_upgrade, etc). This file only wires modules and
//! re-exports; see #1684.

mod errors;
mod events;
mod profile;
mod rate_limit;
mod storage;
mod types;
mod upgrade;

#[cfg(test)]
mod tests_profile_management;

#[cfg(test)]
mod tests_rbac;

#[cfg(test)]
mod tests_errors;

#[cfg(test)]
mod tests_rate_limit;

#[cfg(test)]
mod tests_events;

#[cfg(test)]
mod tests_storage;

pub use errors::ContractError;
pub use profile::*;
pub use types::*;
