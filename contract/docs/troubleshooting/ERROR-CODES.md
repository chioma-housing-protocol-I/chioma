# Chioma Contract Error Codes Reference

This document provides a comprehensive reference of error codes used across the Chioma housing protocol smart contracts.

## Overview

Error codes are returned as `u32` values when a contract operation fails. This guide helps developers and integrators understand the meaning, causes, and potential solutions for these errors.

---

## 1. Payment Contract Errors (`PaymentError`)

_Location: `contract/contracts/payment/src/errors.rs`_

| Code | Name                               | Meaning                                                   | Potential Solution                                             |
| ---- | ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 5    | `InvalidAmount`                    | The provided amount is invalid (e.g., zero or negative).  | Ensure the amount is greater than zero and properly formatted. |
| 10   | `AgreementNotActive`               | The rental agreement is not in an active state.           | Verify the agreement status before attempting payment.         |
| 11   | `PaymentNotFound`                  | The specified payment record could not be found.          | Check the payment ID hash.                                     |
| 12   | `PaymentFailed`                    | The core payment processing logic failed.                 | Check Stellar network status or account balance.               |
| 13   | `AgreementNotFound`                | The associated rental agreement was not found.            | Verify the agreement ID.                                       |
| 14   | `NotTenant`                        | Caller is not authorized as the tenant.                   | Ensure you are calling from the tenant's Stellar address.      |
| 17   | `InvalidPaymentAmount`             | Payment amount does not match the expected value.         | Verify the invoice amount.                                     |
| 18   | `PaymentNotDue`                    | The payment is being attempted too early.                 | Check the payment schedule.                                    |
| 19   | `RecurringPaymentNotFound`         | The recurring payment setup was not found.                | Verify the recurring ID.                                       |
| 20   | `InvalidRecurringDates`            | The dates for the recurring payment are invalid.          | Ensure start date is before end date.                          |
| 21   | `RecurringPaymentNotActive`        | The recurring payment is currently inactive.              | Reactivate the recurring payment via the landlord.             |
| 22   | `RecurringPaymentNotPaused`        | Attempting to resume a payment that isn't paused.         | No action needed.                                              |
| 23   | `RecurringPaymentAlreadyCancelled` | The recurring payment is already cancelled.               | Create a new recurring payment if needed.                      |
| 24   | `RecurringPaymentAlreadyCompleted` | All installments for this recurring payment are finished. | Check the payment history.                                     |
| 25   | `RecurringPaymentExecutionFailed`  | Automated execution of a recurring installment failed.    | Check account balance and trustlines.                          |
| 26   | `RecurringPaymentNotFailed`        | Attempting to retry a payment that hasn't failed.         | Verify status before retrying.                                 |
| 27   | `RateLimitExceeded`                | Too many requests for this operation.                     | Wait and try again later.                                      |
| 28   | `CooldownNotMet`                   | Operation attempted before the required waiting period.   | Respect the protocol's cooldown requirements.                  |
| 29   | `LateFeeConfigNotFound`            | Late fee parameters for this agreement are missing.       | Configure late fees in the agreement.                          |
| 30   | `LateFeeRecordNotFound`            | Specific late fee record missing for this payment.        | Verify if a late fee was supposed to be applied.               |
| 31   | `LateFeeAlreadyApplied`            | Late fee has already been charged for this period.        | Avoid duplicate late fee applications.                         |
| 32   | `LateFeeAlreadyWaived`             | Late fee was previously waived and cannot be reapplied.   | Check the waiver history.                                      |
| 33   | `InvalidLateFeePercentage`         | Percentage must be between 1 and 100.                     | Fix the configuration value.                                   |
| 34   | `PaymentNotLate`                   | Attempting to apply late fees within the grace period.    | Wait until the grace period expires.                           |
| 35   | `NotLandlord`                      | Caller is not the authorized landlord.                    | Ensure admin actions are taken by the landlord.                |

---

## 2. Property Registry Errors (`PropertyError`)

_Location: `contract/contracts/property_registry/src/errors.rs`_

| Code | Name                    | Meaning                                         | Potential Solution             |
| ---- | ----------------------- | ----------------------------------------------- | ------------------------------ |
| 1    | `AlreadyInitialized`    | Contract setup has already been performed.      | Do not call initialize again.  |
| 2    | `NotInitialized`        | Contract is being used before setup.            | Run the initialization script. |
| 3    | `PropertyAlreadyExists` | A property with this ID is already registered.  | Use a unique identifier.       |
| 4    | `PropertyNotFound`      | The requested property ID does not exist.       | Verify the property ID.        |
| 5    | `Unauthorized`          | Caller lacks permissions for this action.       | Check admin/owner status.      |
| 6    | `AlreadyVerified`       | Property has already been verified by an admin. | No action needed.              |
| 7    | `InvalidPropertyId`     | The property ID format is invalid.              | Ensure ID is non-empty.        |
| 8    | `InvalidMetadata`       | Metadata hash (e.g., CID) is invalid.           | Verify IPFS/metadata hash.     |

---

## 3. User Profile Errors (`ContractError`)

_Location: `contract/contracts/user_profile/src/errors.rs`_

| Code | Name                   | Meaning                                           | Potential Solution                       |
| ---- | ---------------------- | ------------------------------------------------- | ---------------------------------------- |
| 1    | `AlreadyInitialized`   | Profile contract already setup.                   | N/A                                      |
| 2    | `ProfileAlreadyExists` | Account already has an on-chain profile.          | Use update instead of create.            |
| 3    | `ProfileNotFound`      | No profile found for this account.                | Create a profile first.                  |
| 4    | `InvalidHashLength`    | Hash must be 32 (SHA-256) or 46 (IPFS CID) bytes. | Check hashing algorithm.                 |
| 5    | `AdminNotConfigured`   | Admin address not set for this contract.          | Initialize with an admin address.        |
| 6    | `UnauthorizedAdmin`    | Action requires admin privileges.                 | Call from an admin address.              |
| 7    | `AccessDenied`         | Caller is not the owner of the profile.           | Only the owner can modify their profile. |

---

## 4. Escrow Errors (`EscrowError`)

_Location: `contract/contracts/escrow/src/errors.rs`_

| Code | Name                | Meaning                                           | Potential Solution                         |
| ---- | ------------------- | ------------------------------------------------- | ------------------------------------------ |
| 1    | `NotAuthorized`     | Caller is not authorized to release or dispute.   | Check account addresses.                   |
| 2    | `InvalidState`      | Current escrow state doesn't allow this action.   | e.g., cannot release if already released.  |
| 3    | `InsufficientFunds` | Escrow balance too low for the requested release. | Check deposited amount.                    |
| 4    | `AlreadySigned`     | Signer has already provided approval.             | No action needed.                          |
| 5    | `InvalidSigner`     | Provided address is not a party to this escrow.   | Use correct addresses.                     |
| 6    | `DisputeActive`     | Action blocked while a dispute is active.         | Resolve the dispute via arbitration first. |
| 9    | `EscrowNotFound`    | Specified escrow ID does not exist.               | Check the ID hash.                         |
| 12   | `TimeoutNotReached` | Attempting a timeout release before expiry.       | Wait for the lock period to end.           |
| 14   | `InvalidAmount`     | Release amount is zero or exceeds balance.        | Adjust release amount.                     |
| 16   | `RateLimitExceeded` | Too many operations in a short period.            | Throttling applied.                        |

---

## 5. Agent Registry Errors (`AgentError`)

_Location: `contract/contracts/agent_registry/src/errors.rs`_

| Code | Name                     | Meaning                                                | Potential Solution             |
| ---- | ------------------------ | ------------------------------------------------------ | ------------------------------ |
| 3    | `AgentAlreadyRegistered` | Agent is already in the registry.                      | Use update instead of create.  |
| 4    | `AgentNotFound`          | Requested agent ID does not exist.                     | Verify the agent ID.           |
| 9    | `AgentNotVerified`       | Agent cannot perform this action without verification. | Complete verification process. |

---

## 6. Rent Obligation Errors (`ObligationError`)

_Location: `contract/contracts/rent_obligation/src/errors.rs`_

| Code | Name                         | Meaning                                          | Potential Solution             |
| ---- | ---------------------------- | ------------------------------------------------ | ------------------------------ |
| 3    | `ObligationAlreadyExists`    | NFT/Token for this rent period already minted.   | Check existing obligations.    |
| 4    | `ObligationNotFound`         | Specific rent obligation record missing.         | Verify the obligation ID.      |
| 9    | `CannotBurnActiveObligation` | Cannot settle an obligation that hasn't expired. | Wait for obligation to expire. |

---

## 7. Dispute Resolution Errors (`DisputeError`)

_Location: `contract/contracts/dispute_resolution/src/errors.rs`_

| Code | Name                          | Meaning                                    | Potential Solution                      |
| ---- | ----------------------------- | ------------------------------------------ | --------------------------------------- |
| 1    | `AlreadyInitialized`          | Contract setup has already been performed. | Do not call initialize again.           |
| 2    | `NotInitialized`              | Contract is being used before setup.       | Run the initialization script.          |
| 3    | `Unauthorized`                | Caller lacks permissions for this action.  | Check admin/arbiter status.             |
| 4    | `ArbiterAlreadyExists`        | Arbiter is already registered.             | Use update instead of create.           |
| 5    | `ArbiterNotFound`             | Requested arbiter does not exist.          | Verify the arbiter ID.                  |
| 6    | `DisputeNotFound`             | Specified dispute does not exist.          | Check the dispute ID.                   |
| 7    | `DisputeAlreadyExists`        | Dispute with this ID already exists.       | Use a unique dispute ID.                |
| 8    | `DisputeAlreadyResolved`      | Dispute has already been resolved.         | No action needed.                       |
| 9    | `AlreadyVoted`                | Arbiter has already voted on this dispute. | Cannot vote twice.                      |
| 10   | `InvalidDetailsHash`          | Evidence hash format is invalid.           | Verify hash format.                     |
| 11   | `InsufficientVotes`           | Not enough votes to resolve dispute.       | Wait for more arbiter votes.            |
| 12   | `AgreementNotFound`           | Associated agreement not found.            | Verify agreement exists.                |
| 13   | `InvalidAgreementState`       | Agreement state doesn't allow dispute.     | Check agreement status.                 |
| 14   | `AppealAlreadyExists`         | Appeal for this dispute already exists.    | Cannot appeal twice.                    |
| 15   | `AppealNotFound`              | Specified appeal does not exist.           | Check appeal ID.                        |
| 16   | `AppealWindowExpired`         | Too late to appeal this decision.          | Appeals must be filed within timeframe. |
| 17   | `InsufficientAppealArbiters`  | Not enough arbiters for appeal.            | Wait for more arbiters to be available. |
| 18   | `ArbiterNotEligibleForAppeal` | Arbiter cannot participate in appeal.      | Check eligibility criteria.             |
| 19   | `AppealAlreadyResolved`       | Appeal has already been resolved.          | No action needed.                       |
| 20   | `AppealAlreadyVoted`          | Arbiter has already voted on appeal.       | Cannot vote twice on appeal.            |
| 21   | `InsufficientAppealVotes`     | Not enough votes to resolve appeal.        | Wait for more votes.                    |
| 22   | `AppealFeeRequired`           | Appeal requires payment of fee.            | Pay the required appeal fee.            |
| 23   | `AppealNotCancelable`         | Appeal cannot be cancelled at this stage.  | Appeals are final once started.         |
| 24   | `TimeoutNotReached`           | Action attempted before timeout period.    | Wait for timeout to expire.             |
| 25   | `InvalidTimeoutConfig`        | Timeout configuration is invalid.          | Fix timeout parameters.                 |
| 26   | `InvalidRating`               | Rating value is out of valid range.        | Use rating between 1-5.                 |
| 27   | `RateLimitExceeded`           | Too many requests in short period.         | Wait and retry.                         |
| 28   | `CooldownNotMet`              | Action attempted before cooldown period.   | Respect cooldown requirements.          |

---

## 8. Chioma Main Contract Errors (`RentalError`)

_Location: `contract/contracts/chioma/src/errors.rs`_

| Code | Name                         | Meaning                                    | Potential Solution                 |
| ---- | ---------------------------- | ------------------------------------------ | ---------------------------------- |
| 1    | `AlreadyInitialized`         | Contract setup has already been performed. | Do not call initialize again.      |
| 2    | `InvalidAdmin`               | Admin address is invalid.                  | Provide valid Stellar address.     |
| 3    | `InvalidConfig`              | Configuration parameters are invalid.      | Check configuration values.        |
| 4    | `AgreementAlreadyExists`     | Rental agreement already exists.           | Use update or different ID.        |
| 5    | `InvalidAmount`              | Amount is invalid (zero or negative).      | Use positive amount.               |
| 6    | `InvalidDate`                | Date format or value is invalid.           | Check date format and logic.       |
| 7    | `InvalidCommissionRate`      | Commission rate is out of valid range.     | Use rate between 0-100%.           |
| 10   | `AgreementNotActive`         | Agreement is not in active state.          | Check agreement status.            |
| 13   | `AgreementNotFound`          | Rental agreement not found.                | Verify agreement ID.               |
| 14   | `NotTenant`                  | Caller is not the tenant.                  | Use tenant's address.              |
| 15   | `InvalidState`               | Current state doesn't allow this action.   | Check state transitions.           |
| 16   | `Expired`                    | Agreement or operation has expired.        | Renew or check expiry.             |
| 17   | `ContractPaused`             | Contract is in emergency pause.            | Wait for unpause or contact admin. |
| 18   | `Unauthorized`               | Caller lacks required permissions.         | Check authorization.               |
| 19   | `TokenNotSupported`          | Token is not supported for payments.       | Use supported token.               |
| 20   | `RateNotFound`               | Exchange rate not available.               | Check rate configuration.          |
| 21   | `ConversionError`            | Currency conversion failed.                | Verify conversion parameters.      |
| 22   | `InsufficientPayment`        | Payment amount is insufficient.            | Increase payment amount.           |
| 23   | `AlreadyPaused`              | Contract is already paused.                | No action needed.                  |
| 24   | `NotPaused`                  | Contract is not paused.                    | Cannot unpause if not paused.      |
| 25   | `InterestConfigNotFound`     | Interest configuration missing.            | Set up interest parameters.        |
| 26   | `InterestAlreadyInitialized` | Interest already configured.               | Update instead of initialize.      |
| 27   | `NoPrincipal`                | No principal amount available.             | Deposit principal first.           |
| 201  | `PaymentInsufficientFunds`   | Insufficient funds for payment.            | Add more funds.                    |
| 202  | `PaymentAlreadyProcessed`    | Payment already processed.                 | Check payment status.              |
| 203  | `PaymentFailed`              | Payment processing failed.                 | Check network and balances.        |
| 204  | `PaymentInvalidAmount`       | Payment amount is invalid.                 | Use valid amount.                  |
| 301  | `TimelockNotFound`           | Timelock record not found.                 | Verify timelock ID.                |
| 302  | `TimelockAlreadyExecuted`    | Timelock already executed.                 | Cannot execute twice.              |
| 303  | `TimelockAlreadyCancelled`   | Timelock already cancelled.                | Cannot cancel twice.               |
| 304  | `TimelockEtaNotReached`      | Timelock execution time not reached.       | Wait for ETA.                      |
| 401  | `EscrowNotFound`             | Escrow record not found.                   | Verify escrow ID.                  |
| 402  | `EscrowAlreadyReleased`      | Escrow already released.                   | Cannot release twice.              |
| 403  | `EscrowInsufficientFunds`    | Escrow has insufficient funds.             | Check escrow balance.              |
| 404  | `EscrowTimeoutNotReached`    | Escrow timeout not reached.                | Wait for timeout.                  |

---

## Error Code Ranges

- **1-99**: General contract errors (initialization, authorization, state)
- **100-199**: Business logic errors (agreements, properties, profiles)
- **200-299**: Payment-specific errors
- **300-399**: Timelock-specific errors
- **400-499**: Escrow-specific errors

## Troubleshooting Tips

1. **Check the error code**: Match the returned `u32` value with this reference
2. **Verify contract state**: Ensure the contract is properly initialized
3. **Check permissions**: Confirm the caller has appropriate authorization
4. **Validate inputs**: Ensure all parameters are within valid ranges
5. **Check network status**: Verify Stellar network connectivity
6. **Review transaction history**: Look for related failed transactions

For additional help, see:

- [COMMON-ISSUES.md](COMMON-ISSUES.md) - Common problems and solutions
- [DEBUGGING-GUIDE.md](DEBUGGING-GUIDE.md) - Step-by-step debugging procedures
- [FAQ.md](FAQ.md) - Frequently asked questions
