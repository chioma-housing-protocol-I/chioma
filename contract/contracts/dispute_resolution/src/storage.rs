use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Arbiter(Address),
    State,
    Initialized,
    ArbiterCount,
    Dispute(String),
    Vote(String, Address),
}
