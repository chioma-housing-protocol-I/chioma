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

<<<<<<< HEAD
    /// Rate limit exceeded for this operation
    RateLimitExceeded = 8,

    /// Cooldown period not met between successive calls
=======
    /// Rate limit exceeded for this function/user/block
    RateLimitExceeded = 8,

    /// Caller is within the cooldown period for this function
>>>>>>> upstream/main
    CooldownNotMet = 9,
}
