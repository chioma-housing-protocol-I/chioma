use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    Obligation(String),
    Owner(String),
    ObligationCount,
    BurnRecord(String),
    BurnedNfts(String),
    BurnCount,
    UpgradeProposal(String),
    /// System admin address, set via `initialize_admin`.
    Admin,
    /// Rate limiting configuration.
    RateLimitConfig,
    /// User call count for rate limiting: DataKey::UserCallCount(user, function_name)
    UserCallCount(Address, String),
    /// Block call count for rate limiting: DataKey::BlockCallCount(block_number, function_name)
    BlockCallCount(u64, String),
}
