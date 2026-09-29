use soroban_sdk::{contracttype, Address, Env, IntoVal, String, Val};

/// Rent bump threshold/amount for persistent entity keys, in ledgers.
/// Matches the 500_000-ledger convention used across the other Chioma
/// contracts (roughly a month at ~5s/ledger). See #1683.
pub const TTL_THRESHOLD: u32 = 500_000;
pub const TTL_BUMP: u32 = 500_000;

/// Extends a persistent key's TTL using the contract-wide convention.
/// Call this immediately after every `env.storage().persistent().set(...)`
/// on entity data so a profile that stops receiving writes isn't silently
/// archived out (#1683).
pub fn extend_persistent_ttl<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_BUMP);
}

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

    /// Rate limiting configuration
    RateLimitConfig,

    /// User call count for rate limiting: DataKey::UserCallCount(user, function_name)
    UserCallCount(Address, String),

    /// Block call count for rate limiting: DataKey::BlockCallCount(block_number, function_name)
    BlockCallCount(u64, String),
}
