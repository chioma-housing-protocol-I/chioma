#![no_std]
#![allow(clippy::too_many_arguments)]

//! Escrow Contract
//!
//! Manages security deposit escrows with 2-of-3 multi-sig release mechanism.
//! Supports dispute resolution with arbiter involvement.
//!
//! ## Public surface
//!
//! Unlike most contracts in this workspace, the `#[contract]` struct and its
//! `#[contractimpl]` block are **not** in this file — they live in
//! [`escrow_impl`], re-exported below as [`EscrowContract`]. See
//! `escrow_impl.rs` for the full list of external entry points (create,
//! fund_escrow, approve_release, initiate_dispute, resolve_dispute,
//! release_escrow_on_timeout, etc). This file only wires modules and
//! re-exports; see #1684.

pub mod access;
pub mod dispute;
pub mod errors;
pub mod escrow_impl;
pub mod events;
pub mod rate_limit;
pub mod storage;
pub mod types;
pub mod upgrade;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod tests_rate_limit;

#[cfg(test)]
mod tests_rbac;

#[cfg(test)]
mod tests_property;

#[cfg(test)]
mod tests_support;

#[cfg(test)]
mod tests_dispute_resolution_integration;
mod tests_reentrancy;

// Re-export public APIs
pub use access::AccessControl;
pub use dispute::DisputeHandler;
pub use errors::EscrowError;
pub use escrow_impl::EscrowContract;
pub use storage::EscrowStorage;
pub use types::{DataKey, Escrow, EscrowStatus, ReleaseApproval, TimeoutConfig};
