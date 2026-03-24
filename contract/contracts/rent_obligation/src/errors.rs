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
}
