use soroban_sdk::{contracttype, Address, String};

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

    /// Upgrade proposal
    UpgradeProposal(String),

<<<<<<< HEAD
    /// Rate limit configuration
    RateLimitConfig,

    /// Per-user per-function call count
    UserCallCount(Address, String),

    /// Per-block per-function call count
=======
    /// Rate limiting configuration
    RateLimitConfig,

    /// User call count for rate limiting: DataKey::UserCallCount(user, function_name)
    UserCallCount(Address, String),

    /// Block call count for rate limiting: DataKey::BlockCallCount(block_number, function_name)
>>>>>>> upstream/main
    BlockCallCount(u64, String),
}
