use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ObligationError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    ObligationAlreadyExists = 3,
    ObligationNotFound = 4,
    Unauthorized = 5,
    InvalidOwner = 6,
    AlreadyBurned = 7,
    BurnRecordNotFound = 8,
    CannotBurnActiveObligation = 9,
    InvalidBurnReason = 10,
    AdminAlreadySet = 11,
    AdminNotSet = 12,
    RateLimitExceeded = 13,
    CooldownNotMet = 14,
}

/// Pins every `ObligationError` discriminant so off-chain code that maps
/// error codes to messages cannot silently misreport after a variant is
/// added or reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::ObligationError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(ObligationError::AlreadyInitialized as u32, 1);
        assert_eq!(ObligationError::NotInitialized as u32, 2);
        assert_eq!(ObligationError::ObligationAlreadyExists as u32, 3);
        assert_eq!(ObligationError::ObligationNotFound as u32, 4);
        assert_eq!(ObligationError::Unauthorized as u32, 5);
        assert_eq!(ObligationError::InvalidOwner as u32, 6);
        assert_eq!(ObligationError::AlreadyBurned as u32, 7);
        assert_eq!(ObligationError::BurnRecordNotFound as u32, 8);
        assert_eq!(ObligationError::CannotBurnActiveObligation as u32, 9);
        assert_eq!(ObligationError::InvalidBurnReason as u32, 10);
        assert_eq!(ObligationError::AdminAlreadySet as u32, 11);
        assert_eq!(ObligationError::AdminNotSet as u32, 12);
        assert_eq!(ObligationError::RateLimitExceeded as u32, 13);
        assert_eq!(ObligationError::CooldownNotMet as u32, 14);
    }
}
