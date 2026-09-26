//! Custom error types for the Payment contract.
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PaymentError {
    /// Payment record not found
    PaymentNotFound = 11,
    /// Payment processing failed
    PaymentFailed = 12,
    /// Agreement not found
    AgreementNotFound = 13,
    /// Caller is not the tenant
    NotTenant = 14,
    /// Agreement is not active
    AgreementNotActive = 10,
    /// Invalid payment amount
    InvalidPaymentAmount = 17,
    /// Payment not yet due
    PaymentNotDue = 18,
    /// Invalid amount provided
    InvalidAmount = 5,
    /// Recurring payment not found
    RecurringPaymentNotFound = 19,
    /// Invalid recurring payment dates
    InvalidRecurringDates = 20,
    /// Recurring payment is not active
    RecurringPaymentNotActive = 21,
    /// Recurring payment is not paused
    RecurringPaymentNotPaused = 22,
    /// Recurring payment already cancelled
    RecurringPaymentAlreadyCancelled = 23,
    /// Recurring payment already completed
    RecurringPaymentAlreadyCompleted = 24,
    /// Recurring payment execution failed
    RecurringPaymentExecutionFailed = 25,
    /// Recurring payment is not failed
    RecurringPaymentNotFailed = 26,
    /// Rate limit exceeded for this operation
    RateLimitExceeded = 27,
    /// Cooldown period not met
    CooldownNotMet = 28,
    /// Late fee config not found for agreement
    LateFeeConfigNotFound = 29,
    /// Late fee record not found for payment
    LateFeeRecordNotFound = 30,
    /// Late fee already applied to this payment
    LateFeeAlreadyApplied = 31,
    /// Late fee already waived
    LateFeeAlreadyWaived = 32,
    /// Invalid late fee percentage (must be > 0 and <= 100)
    InvalidLateFeePercentage = 33,
    /// Payment is not late (within grace period)
    PaymentNotLate = 34,
    /// Caller is not the landlord
    NotLandlord = 35,
    /// Caller is not the contract admin
    Unauthorized = 36,
    /// Admin has not been configured yet
    AdminNotSet = 37,
    /// Admin has already been configured
    AdminAlreadySet = 38,
    /// Contract is globally paused; state-changing operations are blocked
    ContractPaused = 39,
    /// Contract is not currently paused
    NotPaused = 40,
}

/// Pins every `PaymentError` discriminant so off-chain code that maps error
/// codes to messages cannot silently misreport after a variant is added or
/// reordered (#1686). If this test fails to compile or assert, a
/// discriminant changed and every off-chain consumer needs to be checked.
#[cfg(test)]
mod pin_tests {
    use super::PaymentError;

    #[test]
    fn error_codes_are_pinned() {
        assert_eq!(PaymentError::PaymentNotFound as u32, 11);
        assert_eq!(PaymentError::PaymentFailed as u32, 12);
        assert_eq!(PaymentError::AgreementNotFound as u32, 13);
        assert_eq!(PaymentError::NotTenant as u32, 14);
        assert_eq!(PaymentError::AgreementNotActive as u32, 10);
        assert_eq!(PaymentError::InvalidPaymentAmount as u32, 17);
        assert_eq!(PaymentError::PaymentNotDue as u32, 18);
        assert_eq!(PaymentError::InvalidAmount as u32, 5);
        assert_eq!(PaymentError::RecurringPaymentNotFound as u32, 19);
        assert_eq!(PaymentError::InvalidRecurringDates as u32, 20);
        assert_eq!(PaymentError::RecurringPaymentNotActive as u32, 21);
        assert_eq!(PaymentError::RecurringPaymentNotPaused as u32, 22);
        assert_eq!(PaymentError::RecurringPaymentAlreadyCancelled as u32, 23);
        assert_eq!(PaymentError::RecurringPaymentAlreadyCompleted as u32, 24);
        assert_eq!(PaymentError::RecurringPaymentExecutionFailed as u32, 25);
        assert_eq!(PaymentError::RecurringPaymentNotFailed as u32, 26);
        assert_eq!(PaymentError::RateLimitExceeded as u32, 27);
        assert_eq!(PaymentError::CooldownNotMet as u32, 28);
        assert_eq!(PaymentError::LateFeeConfigNotFound as u32, 29);
        assert_eq!(PaymentError::LateFeeRecordNotFound as u32, 30);
        assert_eq!(PaymentError::LateFeeAlreadyApplied as u32, 31);
        assert_eq!(PaymentError::LateFeeAlreadyWaived as u32, 32);
        assert_eq!(PaymentError::InvalidLateFeePercentage as u32, 33);
        assert_eq!(PaymentError::PaymentNotLate as u32, 34);
        assert_eq!(PaymentError::NotLandlord as u32, 35);
        assert_eq!(PaymentError::Unauthorized as u32, 36);
        assert_eq!(PaymentError::AdminNotSet as u32, 37);
        assert_eq!(PaymentError::AdminAlreadySet as u32, 38);
        assert_eq!(PaymentError::ContractPaused as u32, 39);
        assert_eq!(PaymentError::NotPaused as u32, 40);
    }
}
