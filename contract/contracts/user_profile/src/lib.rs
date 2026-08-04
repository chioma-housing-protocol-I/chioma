#![no_std]

mod errors;
mod events;
mod profile;
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
mod tests_events;

#[cfg(test)]
mod tests_storage;

pub use errors::ContractError;
pub use profile::*;
pub use types::*;
