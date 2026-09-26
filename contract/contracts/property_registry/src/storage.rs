use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Property(String),
    State,
    Initialized,
    PropertyCount,
    UpgradeProposal(String),
    // Rate limiting
    RateLimitConfig,
    UserCallCount(Address, String),
    BlockCallCount(u64, String),
}
