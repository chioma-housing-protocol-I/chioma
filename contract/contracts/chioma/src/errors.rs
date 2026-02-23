use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RentalError {
    AlreadyInitialized = 1,
    InvalidAdmin = 2,
    InvalidConfig = 3,
    AgreementAlreadyExists = 4,
    InvalidAmount = 5,
    InvalidDate = 6,
    InvalidCommissionRate = 7,
    AgreementNotActive = 10,
    AgreementNotFound = 13,
    NotTenant = 14,
    InvalidState = 15,
    Expired = 16,
    ContractPaused = 17,
}
