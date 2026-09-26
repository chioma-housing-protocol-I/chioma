//! Custom error types for the Escrow contract.
//! Each error maps to a unique contract error code.
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
    /// Timeout has not been reached yet
    TimeoutNotReached = 12,
    /// Invalid timeout configuration value
    InvalidTimeoutConfig = 13,
    /// Invalid release amount (e.g., exceeds escrow balance, zero or negative)
    InvalidAmount = 14,
    /// Empty reason string for release
    EmptyReleaseReason = 15,
    /// Rate limit exceeded for this operation
    RateLimitExceeded = 16,
    /// Cooldown period not met
    CooldownNotMet = 17,
    /// Escrow is frozen - no fund movements allowed
    EscrowFrozen = 18,
    /// Escrow is already frozen
    AlreadyFrozen = 19,
    /// Escrow is not frozen
    NotFrozen = 20,
    /// Empty freeze reason string
    EmptyFreezeReason = 21,
    /// System admin not set
    AdminNotSet = 22,
    /// Agreement id must not be empty
    EmptyAgreementId = 23,
    /// Caller is not the configured dispute_resolution contract
    NotDisputeResolutionContract = 24,
    /// Contract is globally paused; state-changing operations are blocked
    ContractPaused = 23,
    /// Contract is not currently paused
    NotPaused = 24,
}

/// Pins every `EscrowError` discriminant so off-chain code that maps error
/// codes to messages cannot silently misreport after a variant is added or
/// reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::EscrowError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(EscrowError::NotAuthorized as u32, 1);
        assert_eq!(EscrowError::InvalidState as u32, 2);
        assert_eq!(EscrowError::InsufficientFunds as u32, 3);
        assert_eq!(EscrowError::AlreadySigned as u32, 4);
        assert_eq!(EscrowError::InvalidSigner as u32, 5);
        assert_eq!(EscrowError::DisputeActive as u32, 6);
        assert_eq!(EscrowError::InvalidRelease as u32, 7);
        assert_eq!(EscrowError::InvalidEscrowId as u32, 8);
        assert_eq!(EscrowError::EscrowNotFound as u32, 9);
        assert_eq!(EscrowError::EmptyDisputeReason as u32, 10);
        assert_eq!(EscrowError::InvalidApprovalTarget as u32, 11);
        assert_eq!(EscrowError::TimeoutNotReached as u32, 12);
        assert_eq!(EscrowError::InvalidTimeoutConfig as u32, 13);
        assert_eq!(EscrowError::InvalidAmount as u32, 14);
        assert_eq!(EscrowError::EmptyReleaseReason as u32, 15);
        assert_eq!(EscrowError::RateLimitExceeded as u32, 16);
        assert_eq!(EscrowError::CooldownNotMet as u32, 17);
        assert_eq!(EscrowError::EscrowFrozen as u32, 18);
        assert_eq!(EscrowError::AlreadyFrozen as u32, 19);
        assert_eq!(EscrowError::NotFrozen as u32, 20);
        assert_eq!(EscrowError::EmptyFreezeReason as u32, 21);
        assert_eq!(EscrowError::AdminNotSet as u32, 22);
        assert_eq!(EscrowError::ContractPaused as u32, 23);
        assert_eq!(EscrowError::NotPaused as u32, 24);
    }
}
