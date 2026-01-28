/// Data structures and enums for the Escrow contract.
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
    /// Reason for dispute, if any
    pub dispute_reason: Option<String>,
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escrow_status_ordering() {
        assert!(EscrowStatus::Pending < EscrowStatus::Funded);
        assert!(EscrowStatus::Funded < EscrowStatus::Released);
    }
}
