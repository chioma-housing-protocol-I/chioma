use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AgentError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AgentAlreadyRegistered = 3,
    AgentNotFound = 4,
    Unauthorized = 5,
    AlreadyVerified = 6,
    InvalidProfileHash = 7,
    InvalidRatingScore = 8,
    AgentNotVerified = 9,
    AlreadyRated = 10,
    TransactionNotFound = 11,
    NotTransactionParty = 12,
    TransactionNotCompleted = 13,
    RateLimitExceeded = 14,
    CooldownNotMet = 15,
}

/// Pins every `AgentError` discriminant so off-chain code that maps error
/// codes to messages cannot silently misreport after a variant is added or
/// reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::AgentError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(AgentError::AlreadyInitialized as u32, 1);
        assert_eq!(AgentError::NotInitialized as u32, 2);
        assert_eq!(AgentError::AgentAlreadyRegistered as u32, 3);
        assert_eq!(AgentError::AgentNotFound as u32, 4);
        assert_eq!(AgentError::Unauthorized as u32, 5);
        assert_eq!(AgentError::AlreadyVerified as u32, 6);
        assert_eq!(AgentError::InvalidProfileHash as u32, 7);
        assert_eq!(AgentError::InvalidRatingScore as u32, 8);
        assert_eq!(AgentError::AgentNotVerified as u32, 9);
        assert_eq!(AgentError::AlreadyRated as u32, 10);
        assert_eq!(AgentError::TransactionNotFound as u32, 11);
        assert_eq!(AgentError::NotTransactionParty as u32, 12);
        assert_eq!(AgentError::TransactionNotCompleted as u32, 13);
        assert_eq!(AgentError::RateLimitExceeded as u32, 14);
        assert_eq!(AgentError::CooldownNotMet as u32, 15);
    }
}
