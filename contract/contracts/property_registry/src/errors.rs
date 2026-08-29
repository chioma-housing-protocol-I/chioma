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
    /// Rate limit exceeded for this operation
    RateLimitExceeded = 9,
    /// Cooldown period not met between successive calls
    CooldownNotMet = 10,
}
