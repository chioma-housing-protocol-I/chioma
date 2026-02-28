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
}
