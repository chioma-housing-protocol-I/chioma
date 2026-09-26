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

    // Payment errors
    PaymentInsufficientFunds = 201,
    PaymentAlreadyProcessed = 202,
    PaymentFailed = 203,
    PaymentInvalidAmount = 204,

    // Timelock errors (reusing range 301-304, replacing unused dispute codes)
    TimelockNotFound = 301,
    TimelockAlreadyExecuted = 302,
    TimelockAlreadyCancelled = 303,
    TimelockEtaNotReached = 304,

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
    TimelockDelayTooShort = 902,

    // Multi-sig errors (using range 1100-1105 only)
    MultiSigNotInitialized = 1100,
    ProposalNotFound = 1101,
    ProposalAlreadyExecuted = 1102,
    ProposalExpired = 1103,
    InsufficientApprovals = 1104,
    AlreadyApproved = 1105,
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

            RentalError::PaymentInsufficientFunds => {
                "Insufficient funds. Please ensure you have enough balance."
            }
            RentalError::PaymentAlreadyProcessed => "This payment has already been processed.",
            RentalError::PaymentFailed => "Payment transfer failed. Check permissions and balance.",
            RentalError::PaymentInvalidAmount => "The payment amount is invalid or zero.",

            RentalError::TimelockNotFound => "Timelock action not found.",
            RentalError::TimelockAlreadyExecuted => {
                "This timelock action has already been executed."
            }
            RentalError::TimelockAlreadyCancelled => {
                "This timelock action has already been cancelled."
            }
            RentalError::TimelockEtaNotReached => "The timelock ETA has not been reached yet.",

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
            RentalError::TimelockDelayTooShort => {
                "The specified delay is below the minimum required for this action type."
            }

            RentalError::MultiSigNotInitialized => {
                "Multi-sig has not been initialized for this contract."
            }
            RentalError::ProposalNotFound => "The specified proposal does not exist.",
            RentalError::ProposalAlreadyExecuted => "This proposal has already been executed.",
            RentalError::ProposalExpired => {
                "The proposal has expired and can no longer be executed."
            }
            RentalError::InsufficientApprovals => {
                "Insufficient approvals to execute this proposal."
            }
            RentalError::AlreadyApproved => "You have already approved this proposal.",
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

/// Pins every `RentalError` discriminant so off-chain code that maps error
/// codes to messages cannot silently misreport after a variant is added or
/// reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
///
/// Note: `#[contracterror]` caps this enum at 50 variants (already reached
/// here) — a new error must reuse an existing variant rather than add one.
#[cfg(test)]
mod pin_tests {
    use super::RentalError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(RentalError::AlreadyInitialized as u32, 1);
        assert_eq!(RentalError::InvalidAdmin as u32, 2);
        assert_eq!(RentalError::InvalidConfig as u32, 3);
        assert_eq!(RentalError::AgreementAlreadyExists as u32, 4);
        assert_eq!(RentalError::InvalidAmount as u32, 5);
        assert_eq!(RentalError::InvalidDate as u32, 6);
        assert_eq!(RentalError::InvalidCommissionRate as u32, 7);
        assert_eq!(RentalError::AgreementNotActive as u32, 10);
        assert_eq!(RentalError::AgreementNotFound as u32, 13);
        assert_eq!(RentalError::NotTenant as u32, 14);
        assert_eq!(RentalError::Unauthorized as u32, 18);
        assert_eq!(RentalError::InvalidState as u32, 15);
        assert_eq!(RentalError::Expired as u32, 16);
        assert_eq!(RentalError::ContractPaused as u32, 17);
        assert_eq!(RentalError::TokenNotSupported as u32, 19);
        assert_eq!(RentalError::RateNotFound as u32, 20);
        assert_eq!(RentalError::ConversionError as u32, 21);
        assert_eq!(RentalError::InsufficientPayment as u32, 22);
        assert_eq!(RentalError::AlreadyPaused as u32, 23);
        assert_eq!(RentalError::NotPaused as u32, 24);
        assert_eq!(RentalError::InterestConfigNotFound as u32, 25);
        assert_eq!(RentalError::InterestAlreadyInitialized as u32, 26);
        assert_eq!(RentalError::NoPrincipal as u32, 27);

        assert_eq!(RentalError::PaymentInsufficientFunds as u32, 201);
        assert_eq!(RentalError::PaymentAlreadyProcessed as u32, 202);
        assert_eq!(RentalError::PaymentFailed as u32, 203);
        assert_eq!(RentalError::PaymentInvalidAmount as u32, 204);

        assert_eq!(RentalError::TimelockNotFound as u32, 301);
        assert_eq!(RentalError::TimelockAlreadyExecuted as u32, 302);
        assert_eq!(RentalError::TimelockAlreadyCancelled as u32, 303);
        assert_eq!(RentalError::TimelockEtaNotReached as u32, 304);

        assert_eq!(RentalError::EscrowNotFound as u32, 401);
        assert_eq!(RentalError::EscrowAlreadyReleased as u32, 402);
        assert_eq!(RentalError::EscrowInsufficientFunds as u32, 403);
        assert_eq!(RentalError::EscrowTimeoutNotReached as u32, 404);

        assert_eq!(RentalError::InsufficientPermissions as u32, 501);
        assert_eq!(RentalError::AdminOnly as u32, 502);
        assert_eq!(RentalError::InvalidTransition as u32, 601);
        assert_eq!(RentalError::InvalidInput as u32, 701);
        assert_eq!(RentalError::InvalidAddress as u32, 702);

        assert_eq!(RentalError::RateLimitExceeded as u32, 801);
        assert_eq!(RentalError::CooldownNotMet as u32, 802);
        assert_eq!(RentalError::InternalError as u32, 901);
        assert_eq!(RentalError::TimelockDelayTooShort as u32, 902);

        assert_eq!(RentalError::MultiSigNotInitialized as u32, 1100);
        assert_eq!(RentalError::ProposalNotFound as u32, 1101);
        assert_eq!(RentalError::ProposalAlreadyExecuted as u32, 1102);
        assert_eq!(RentalError::ProposalExpired as u32, 1103);
        assert_eq!(RentalError::InsufficientApprovals as u32, 1104);
        assert_eq!(RentalError::AlreadyApproved as u32, 1105);
    }
}
