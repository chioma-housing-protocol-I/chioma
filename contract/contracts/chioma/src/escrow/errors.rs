/// Custom error types for the Escrow contract.
/// Each error maps to a unique contract error code.
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    /// Caller is not authorized to perform this action
    NotAuthorized = 1,
    /// Escrow is in an invalid state for this operation
    InvalidState = 2,
    /// Insufficient funds for the operation
    InsufficientFunds = 3,
    /// Signer has already approved this release
    AlreadySigned = 4,
    /// Signer is not a valid party to this escrow
    InvalidSigner = 5,
    /// Escrow is actively under dispute
    DisputeActive = 6,
    /// Invalid release target address
    InvalidRelease = 7,
    /// Invalid escrow ID
    InvalidEscrowId = 8,
    /// Escrow does not exist
    EscrowNotFound = 9,
    /// Dispute reason string is empty
    EmptyDisputeReason = 10,
    /// Invalid approval target (neither beneficiary nor depositor)
    InvalidApprovalTarget = 11,
}
