#![no_std]
#![allow(clippy::too_many_arguments)]

//! Escrow Contract
//!
//! Manages security deposit escrows with 2-of-3 multi-sig release mechanism.
//! Supports dispute resolution with arbiter involvement.

pub mod access;
pub mod dispute;
pub mod errors;
pub mod escrow_impl;
pub mod events;
pub mod rate_limit;
pub mod storage;
pub mod types;

#[cfg(test)]
mod tests;

// Re-export public APIs
pub use access::AccessControl;
pub use dispute::DisputeHandler;
pub use errors::EscrowError;
pub use escrow_impl::EscrowContract;
pub use storage::EscrowStorage;
pub use types::{DataKey, Escrow, EscrowStatus, ReleaseApproval, TimeoutConfig};
