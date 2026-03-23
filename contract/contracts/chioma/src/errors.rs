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
    Unauthorized = 18,
    InvalidState = 15,
    Expired = 16,
    ContractPaused = 17,
    ExtensionNotFound = 19,
    ExtensionAlreadyExists = 20,
    NotLandlord = 21,
    TokenNotSupported = 22,
    RateNotFound = 23,
    ConversionError = 24,
    InsufficientPayment = 25,
}
