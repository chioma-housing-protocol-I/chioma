use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DisputeError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    ArbiterAlreadyExists = 4,
    ArbiterNotFound = 5,
    DisputeNotFound = 6,
    DisputeAlreadyExists = 7,
    DisputeAlreadyResolved = 8,
    AlreadyVoted = 9,
    InvalidDetailsHash = 10,
    InsufficientVotes = 11,
    AgreementNotFound = 12,
    InvalidAgreementState = 13,
    AppealAlreadyExists = 14,
    AppealNotFound = 15,
    AppealWindowExpired = 16,
    InsufficientAppealArbiters = 17,
    ArbiterNotEligibleForAppeal = 18,
    AppealAlreadyResolved = 19,
    AppealAlreadyVoted = 20,
    InsufficientAppealVotes = 21,
    AppealFeeRequired = 22,
    AppealNotCancelable = 23,
    TimeoutNotReached = 24,
    InvalidTimeoutConfig = 25,
    InvalidRating = 26,
    RateLimitExceeded = 27,
    CooldownNotMet = 28,
}

/// Pins every `DisputeError` discriminant so off-chain code that maps error
/// codes to messages cannot silently misreport after a variant is added or
/// reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::DisputeError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(DisputeError::AlreadyInitialized as u32, 1);
        assert_eq!(DisputeError::NotInitialized as u32, 2);
        assert_eq!(DisputeError::Unauthorized as u32, 3);
        assert_eq!(DisputeError::ArbiterAlreadyExists as u32, 4);
        assert_eq!(DisputeError::ArbiterNotFound as u32, 5);
        assert_eq!(DisputeError::DisputeNotFound as u32, 6);
        assert_eq!(DisputeError::DisputeAlreadyExists as u32, 7);
        assert_eq!(DisputeError::DisputeAlreadyResolved as u32, 8);
        assert_eq!(DisputeError::AlreadyVoted as u32, 9);
        assert_eq!(DisputeError::InvalidDetailsHash as u32, 10);
        assert_eq!(DisputeError::InsufficientVotes as u32, 11);
        assert_eq!(DisputeError::AgreementNotFound as u32, 12);
        assert_eq!(DisputeError::InvalidAgreementState as u32, 13);
        assert_eq!(DisputeError::AppealAlreadyExists as u32, 14);
        assert_eq!(DisputeError::AppealNotFound as u32, 15);
        assert_eq!(DisputeError::AppealWindowExpired as u32, 16);
        assert_eq!(DisputeError::InsufficientAppealArbiters as u32, 17);
        assert_eq!(DisputeError::ArbiterNotEligibleForAppeal as u32, 18);
        assert_eq!(DisputeError::AppealAlreadyResolved as u32, 19);
        assert_eq!(DisputeError::AppealAlreadyVoted as u32, 20);
        assert_eq!(DisputeError::InsufficientAppealVotes as u32, 21);
        assert_eq!(DisputeError::AppealFeeRequired as u32, 22);
        assert_eq!(DisputeError::AppealNotCancelable as u32, 23);
        assert_eq!(DisputeError::TimeoutNotReached as u32, 24);
        assert_eq!(DisputeError::InvalidTimeoutConfig as u32, 25);
        assert_eq!(DisputeError::InvalidRating as u32, 26);
        assert_eq!(DisputeError::RateLimitExceeded as u32, 27);
        assert_eq!(DisputeError::CooldownNotMet as u32, 28);
    }
}
