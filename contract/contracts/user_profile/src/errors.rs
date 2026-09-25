use soroban_sdk::contracterror;

/// Custom error codes for the User Profile contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// Contract already initialized
    AlreadyInitialized = 1,

    /// Profile already exists for this account
    ProfileAlreadyExists = 2,

    /// Profile not found for this account
    ProfileNotFound = 3,

    /// Invalid data hash length (must be 32 or 46 bytes)
    InvalidHashLength = 4,

    /// Admin not configured
    AdminNotConfigured = 5,

    /// Unauthorized: caller is not admin
    UnauthorizedAdmin = 6,

    /// Access denied: caller is not the owner
    AccessDenied = 7,

    /// Rate limit exceeded for this function/user/block
    RateLimitExceeded = 8,

    /// Caller is within the cooldown period for this function
    CooldownNotMet = 9,
}

/// Pins every `ContractError` discriminant so off-chain code that maps
/// error codes to messages cannot silently misreport after a variant is
/// added or reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::ContractError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(ContractError::AlreadyInitialized as u32, 1);
        assert_eq!(ContractError::ProfileAlreadyExists as u32, 2);
        assert_eq!(ContractError::ProfileNotFound as u32, 3);
        assert_eq!(ContractError::InvalidHashLength as u32, 4);
        assert_eq!(ContractError::AdminNotConfigured as u32, 5);
        assert_eq!(ContractError::UnauthorizedAdmin as u32, 6);
        assert_eq!(ContractError::AccessDenied as u32, 7);
        assert_eq!(ContractError::RateLimitExceeded as u32, 8);
        assert_eq!(ContractError::CooldownNotMet as u32, 9);
    }
}
