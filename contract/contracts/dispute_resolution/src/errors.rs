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
