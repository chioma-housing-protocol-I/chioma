use crate::storage::DataKey;
use crate::types::ErrorContext;
use soroban_sdk::{contracterror, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RentalError {
    // Already existed
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
    TokenNotSupported = 19,
    RateNotFound = 20,
    ConversionError = 21,
    InsufficientPayment = 22,
    AlreadyPaused = 23,
    NotPaused = 24,
    InterestConfigNotFound = 25,
    InterestAlreadyInitialized = 26,
    NoPrincipal = 27,

    // NEW - Booking/Agreement errors
    BookingNotFound = 1001, // Use user's example numbering
    BookingAlreadyExists = 1002,
    BookingInvalidDates = 1003,
    BookingNotAvailable = 1004,
    BookingAlreadyCheckedIn = 1005,
    BookingAlreadyCheckedOut = 1006,

    // Payment errors
    PaymentInsufficientFunds = 201,
    PaymentAlreadyProcessed = 202,
    PaymentFailed = 203,
    PaymentInvalidAmount = 204,

    // Dispute errors
    DisputeNotFound = 301,
    DisputeAlreadyResolved = 302,
    DisputeInvalidOutcome = 303,
    DisputeInsufficientVotes = 304,

    // Escrow errors
    EscrowNotFound = 401,
    EscrowAlreadyReleased = 402,
    EscrowInsufficientFunds = 403,
    EscrowTimeoutNotReached = 404,

    // Authorization & State
    InsufficientPermissions = 501,
    AdminOnly = 502,
    InvalidTransition = 601,
    InvalidInput = 701,
    InvalidAddress = 702,

    // Rate limiting & Generic
    RateLimitExceeded = 801,
    CooldownNotMet = 802,
    InternalError = 901,
    NotImplemented = 902,
}

impl RentalError {
    pub fn message(&self, env: &Env) -> String {
        let msg = match self {
            RentalError::AlreadyInitialized => "Contract already initialized.",
            RentalError::InvalidAdmin => "Invalid admin address provided.",
            RentalError::InvalidConfig => "Invalid configuration parameter.",
            RentalError::AgreementAlreadyExists => "Agreement already exists for the given ID.",
            RentalError::InvalidAmount => "Invalid amount provided for the operation.",
            RentalError::InvalidDate => "Invalid date or timestamp range.",
            RentalError::InvalidCommissionRate => {
                "Commission rate must be between 0 and 10000 bps."
            }
            RentalError::AgreementNotActive => "Agreement is not in an Active state.",
            RentalError::AgreementNotFound => "Agreement not found. Please check the ID.",
            RentalError::NotTenant => "The caller is not the tenant of this agreement.",
            RentalError::Unauthorized => "You are not authorized to perform this action.",
            RentalError::InvalidState => {
                "Contract or agreement state is invalid for this operation."
            }
            RentalError::Expired => "The agreement or operation has expired.",
            RentalError::ContractPaused => "Operations are currently paused by the administrator.",
            RentalError::TokenNotSupported => "The specified payment token is not supported.",
            RentalError::RateNotFound => "Exchange rate for the given token pair not found.",
            RentalError::ConversionError => {
                "Error occurred while converting amounts between tokens."
            }
            RentalError::InsufficientPayment => {
                "Provided payment is insufficient for the required amount."
            }
            RentalError::AlreadyPaused => "The contract is already in a paused state.",
            RentalError::NotPaused => "The contract is not currently paused.",
            RentalError::InterestConfigNotFound => {
                "Interest configuration for the agreement not found."
            }
            RentalError::InterestAlreadyInitialized => {
                "Deposit interest is already initialized for this agreement."
            }
            RentalError::NoPrincipal => "No security deposit found to accrue interest on.",

            RentalError::BookingNotFound => "Booking not found. Please check the booking ID.",
            RentalError::BookingAlreadyExists => {
                "Booking already exists for this property and date range."
            }
            RentalError::BookingInvalidDates => "Invalid dates: check-out must be after check-in.",
            RentalError::BookingNotAvailable => {
                "The requested property is not available for these dates."
            }
            RentalError::BookingAlreadyCheckedIn => "Booking has already been checked in.",
            RentalError::BookingAlreadyCheckedOut => "Booking has already been checked out.",

            RentalError::PaymentInsufficientFunds => {
                "Insufficient funds. Please ensure you have enough balance."
            }
            RentalError::PaymentAlreadyProcessed => "This payment has already been processed.",
            RentalError::PaymentFailed => "Payment transfer failed. Check permissions and balance.",
            RentalError::PaymentInvalidAmount => "The payment amount is invalid or zero.",

            RentalError::DisputeNotFound => "Dispute record not found.",
            RentalError::DisputeAlreadyResolved => "This dispute has already been resolved.",
            RentalError::DisputeInvalidOutcome => "The proposed dispute outcome is invalid.",
            RentalError::DisputeInsufficientVotes => {
                "Not enough votes reached to resolve the dispute."
            }

            RentalError::EscrowNotFound => "Escrow account not found for this agreement.",
            RentalError::EscrowAlreadyReleased => "Escrow funds have already been released.",
            RentalError::EscrowInsufficientFunds => {
                "Insufficient funds in escrow for this withdrawal."
            }
            RentalError::EscrowTimeoutNotReached => "Escrow period has not yet expired.",

            RentalError::InsufficientPermissions => {
                "Insufficient permissions to perform this action."
            }
            RentalError::AdminOnly => "This operation is restricted to contract administrators.",
            RentalError::InvalidTransition => "Invalid state transition for the current record.",
            RentalError::InvalidInput => "Invalid input data provided to the function.",
            RentalError::InvalidAddress => "A provided address is invalid or malformed.",

            RentalError::RateLimitExceeded => "Rate limit exceeded. Please wait before retrying.",
            RentalError::CooldownNotMet => "Operation cooldown period has not yet met.",
            RentalError::InternalError => "An unexpected internal error occurred.",
            RentalError::NotImplemented => "This feature is not yet implemented.",
        };
        String::from_str(env, msg)
    }

    pub fn code(&self) -> u32 {
        *self as u32
    }
}

pub fn log_error(
    env: &Env,
    error: RentalError,
    operation: String,
    details: String,
) -> Result<(), RentalError> {
    let mut count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ErrorLogCount)
        .unwrap_or(0);

    let context = ErrorContext {
        error_code: error.code(),
        error_message: error.message(env),
        details,
        timestamp: env.ledger().timestamp(),
        operation,
    };

    env.storage()
        .persistent()
        .set(&DataKey::ErrorLog(count), &context);

    count += 1;
    env.storage()
        .instance()
        .set(&DataKey::ErrorLogCount, &count);

    // Publish event
    crate::events::error_occurred(
        env,
        context.error_code,
        context.operation,
        context.timestamp,
    );

    Ok(())
}

pub fn get_error_logs(env: &Env, limit: u32) -> Result<Vec<ErrorContext>, RentalError> {
    let count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::ErrorLogCount)
        .unwrap_or(0);
    let mut logs = Vec::new(env);

    let start = count.saturating_sub(limit);

    for i in start..count {
        if let Some(log) = env
            .storage()
            .persistent()
            .get::<DataKey, ErrorContext>(&DataKey::ErrorLog(i))
        {
            logs.push_back(log);
        }
    }

    Ok(logs)
}
