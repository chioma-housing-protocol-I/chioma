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
    RateLimitConfig,
    UserCallCount(Address, String),
    BlockCallCount(u64, String),
}
