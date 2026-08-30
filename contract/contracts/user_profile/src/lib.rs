#![no_std]

mod errors;
mod events;
mod profile;
<<<<<<< HEAD
pub mod rate_limit;
=======
mod rate_limit;
>>>>>>> upstream/main
mod storage;
mod types;
mod upgrade;

#[cfg(test)]
mod tests_profile_management;

#[cfg(test)]
<<<<<<< HEAD
mod tests_rate_limit;

=======
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
>>>>>>> upstream/main
pub use profile::*;
pub use types::*;
