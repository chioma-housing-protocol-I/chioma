//! Data structures and enums for the Escrow contract.
use soroban_sdk::{contracttype, Address, BytesN, String};

/// Status of an escrow throughout its lifecycle.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[contracttype]
pub enum EscrowStatus {
    /// Initial state after creation, not yet funded
    Pending = 0,
    /// Funds have been deposited into escrow
    Funded = 1,
    /// Funds have been released to the beneficiary
    Released = 2,
    /// Funds have been refunded to the depositor
    Refunded = 3,
    /// Under dispute, awaiting admin resolution
    Disputed = 4,
}

/// Represents a security deposit escrow managed by 2-of-3 multi-sig.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Escrow {
    /// Unique identifier for the escrow (hash of agreement_id)
    pub id: BytesN<32>,
    /// The party depositing funds (tenant)
    pub depositor: Address,
    /// The party who benefits from the deposit (landlord)
    pub beneficiary: Address,
    /// The admin/arbiter who can resolve disputes
    pub arbiter: Address,
    /// Amount of funds in the escrow
    pub amount: i128,
    /// Token contract address (USDC, XLM, etc.)
    pub token: Address,
    /// Current status of the escrow
    pub status: EscrowStatus,
    /// Timestamp when escrow was created
    pub created_at: u64,
    /// Timeout threshold in days for automatic escrow release/refund
    pub timeout_days: u64,
    /// Timestamp when dispute was raised
    pub disputed_at: Option<u64>,
    /// Reason for dispute, if any
    pub dispute_reason: Option<String>,
}

/// Contract-level timeout configuration.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct TimeoutConfig {
    pub escrow_timeout_days: u64,
    pub dispute_timeout_days: u64,
    pub payment_timeout_days: u64,
}

/// Records approval of fund release by a single party.
#[derive(Clone, Debug)]
#[contracttype]
pub struct ReleaseApproval {
    /// Address of the party approving release
    pub signer: Address,
    /// Target address for funds release (beneficiary or depositor)
    pub release_to: Address,
    /// Timestamp of the approval
    pub timestamp: u64,
}

/// Records a partial release from an escrow.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct ReleaseRecord {
    /// Unique identifier for the escrow
    pub escrow_id: BytesN<32>,
    /// Amount released in this transaction
    pub amount: i128,
    /// Recipient of the released funds
    pub recipient: Address,
    /// Timestamp when the release occurred
    pub released_at: u64,
    /// Reason for the release (e.g., "partial refund", "damage deduction")
    pub reason: String,
}

/// Rate limiting configuration.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct RateLimitConfig {
    pub max_calls_per_block: u32,
    pub max_calls_per_user_per_day: u32,
    pub cooldown_blocks: u32,
}

/// User call count for rate limiting.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct UserCallCount {
    pub user: Address,
    pub call_count: u32,
    pub last_call_block: u64,
    pub daily_count: u32,
    pub daily_reset_block: u64,
}

/// Storage key variants for persistent storage.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    /// Store escrow by ID: DataKey::Escrow(escrow_id)
    Escrow(BytesN<32>),
    /// Store approvals for an escrow: DataKey::Approvals(escrow_id)
    Approvals(BytesN<32>),
    /// Store dispute info: DataKey::DisputeInfo(escrow_id)
    DisputeInfo(BytesN<32>),
    /// Counter for total escrows created
    EscrowCount,
    /// Per-target approval count: DataKey::ApprovalCount(escrow_id, release_to) => u32
    ApprovalCount(BytesN<32>, Address),
    /// Per-signer-per-target flag: DataKey::SignerApproved(escrow_id, signer, release_to) => bool
    SignerApproved(BytesN<32>, Address, Address),
    /// Contract-level timeout configuration
    TimeoutConfig,
    /// Store release history for an escrow: DataKey::ReleaseHistory(escrow_id)
    ReleaseHistory(BytesN<32>),
    /// Rate limiting configuration
    RateLimitConfig,
    /// User call count for rate limiting: DataKey::UserCallCount(user, function_name)
    UserCallCount(Address, String),
    /// Block call count for rate limiting: DataKey::BlockCallCount(block_number, function_name)
    BlockCallCount(u64, String),
}
