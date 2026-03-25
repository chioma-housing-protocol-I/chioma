use soroban_sdk::{contracttype, Address, Bytes, String};

/// Account type enumeration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccountType {
    Tenant = 0,
    Landlord = 1,
    Agent = 2,
}

/// On-chain user profile structure (SEP-29 compliant)
/// Minimal data stored on-chain for gas efficiency
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserProfile {
    /// Stellar account address
    pub account_id: Address,

    /// Data structure version for future upgrades
    pub version: String,

    /// User account type
    pub account_type: AccountType,

    /// Last update timestamp (Unix epoch)
    pub last_updated: u64,

    /// Hash of complete off-chain profile data (IPFS CID or SHA-256)
    pub data_hash: Bytes,

    /// KYC/verification status
    pub is_verified: bool,
}

impl UserProfile {
    /// Create a new profile
    pub fn new(
        account_id: Address,
        account_type: AccountType,
        data_hash: Bytes,
        timestamp: u64,
    ) -> Self {
        Self {
            account_id,
            version: String::from_str(&soroban_sdk::Env::default(), "1.0"),
            account_type,
            last_updated: timestamp,
            data_hash,
            is_verified: false,
        }
    }
}
