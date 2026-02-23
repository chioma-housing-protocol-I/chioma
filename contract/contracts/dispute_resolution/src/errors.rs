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
}
