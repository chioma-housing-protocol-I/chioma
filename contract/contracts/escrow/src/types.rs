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
    /// The raw rental agreement identifier this escrow secures.
    /// This is the same `agreement_id: String` used as the key for every
    /// `dispute_resolution` contract call (`raise_dispute`, `get_dispute`, ...).
    /// `id` above is a derived hash and cannot be reversed back into this
    /// string, so it is stored separately to let escrow delegate disputes
    /// into `dispute_resolution` by the id that system actually understands.
    pub agreement_id: String,
    /// The party depositing funds (tenant)
    pub depositor: Address,
    /// The party who benefits from the deposit (landlord/admin)
    pub beneficiary: Address,
    /// Legacy admin/arbiter address.
    ///
    /// NOTE (issue #1560): this address no longer has unilateral authority to
    /// resolve disputes. Dispute resolution now always routes through the
    /// `dispute_resolution` contract's arbiter voting/appeal system (see
    /// `dispute_resolution_contract` below and `dispute::DisputeHandler`).
    /// `arbiter` is kept only for: (a) backward-compatible reads of who was
    /// configured as the escrow's original admin, and (b) its pre-existing,
    /// unrelated role as one of the 3 signers in the 2-of-3 multi-sig
    /// `approve_release` flow and as the caller of `release_rent`. It is no
    /// longer consulted anywhere in dispute resolution.
    pub arbiter: Address,
    /// Platform governance address receiving 5% on rent release
    pub platform_governance: Address,
    /// Agent/referral address receiving 5% on rent release
    pub agent_referral: Address,
    /// Address of the `dispute_resolution` contract instance this escrow
    /// delegates dispute initiation to, and the only caller authorized to
    /// invoke `resolve_dispute_from_arbitration` once arbitration concludes.
    pub dispute_resolution_contract: Address,
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
    /// Reason for dispute, if any. This is the same string forwarded to
    /// `dispute_resolution::raise_dispute` as `details_hash`; escrow keeps a
    /// local copy purely for convenience reads (`get_dispute_info`), the
    /// system of record for dispute content/voting/appeal is
    /// `dispute_resolution`, not this field.
    pub dispute_reason: Option<String>,
    /// Emergency freeze flag - prevents all fund movements when true
    pub is_frozen: bool,
    /// Timestamp when escrow was frozen
    pub frozen_at: Option<u64>,
    /// Reason for freezing the escrow
    pub freeze_reason: Option<String>,
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
    /// System admin address for emergency operations
    SystemAdmin,
    /// Whether the contract is globally paused (#1689)
    Paused,
    /// Upgrade proposal
    UpgradeProposal(String),
}
