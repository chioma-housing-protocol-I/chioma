use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PropertyError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    PropertyAlreadyExists = 3,
    PropertyNotFound = 4,
    Unauthorized = 5,
    AlreadyVerified = 6,
    InvalidPropertyId = 7,
    InvalidMetadata = 8,
    RateLimitExceeded = 9,
    CooldownNotMet = 10,
}

/// Pins every `PropertyError` discriminant so off-chain code that maps
/// error codes to messages cannot silently misreport after a variant is
/// added or reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::PropertyError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(PropertyError::AlreadyInitialized as u32, 1);
        assert_eq!(PropertyError::NotInitialized as u32, 2);
        assert_eq!(PropertyError::PropertyAlreadyExists as u32, 3);
        assert_eq!(PropertyError::PropertyNotFound as u32, 4);
        assert_eq!(PropertyError::Unauthorized as u32, 5);
        assert_eq!(PropertyError::AlreadyVerified as u32, 6);
        assert_eq!(PropertyError::InvalidPropertyId as u32, 7);
        assert_eq!(PropertyError::InvalidMetadata as u32, 8);
        assert_eq!(PropertyError::RateLimitExceeded as u32, 9);
        assert_eq!(PropertyError::CooldownNotMet as u32, 10);
    }
}
