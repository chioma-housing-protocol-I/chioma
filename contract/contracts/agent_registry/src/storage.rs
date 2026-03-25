use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Agent(Address),
    State,
    Initialized,
    AgentCount,
    Transaction(String),
    AgentRating(Address, Address),
}
