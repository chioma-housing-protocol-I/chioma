use soroban_sdk::{contracttype, Address};

/// Storage keys for contract data
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Profile data keyed by account address
    Profile(Address),

    /// Contract admin address
    Admin,

    /// Contract initialization flag
    Initialized,
}
