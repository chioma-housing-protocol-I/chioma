#![no_std]
#![allow(clippy::too_many_arguments)]

//! Payment Contract
//!
//! Handles rent payment processing with automatic commission splitting
//! and payment record management.

use soroban_sdk::{contract, contractimpl, Address, Env, String};

pub mod errors;
pub mod payment_impl;
pub mod storage;
pub mod types;

#[cfg(test)]
mod tests;

// Re-export public APIs
pub use errors::PaymentError;
pub use payment_impl::{calculate_payment_split, create_payment_record};
pub use storage::DataKey;
pub use types::{PaymentRecord, PaymentSplit};

use crate::errors::PaymentError as Error;
use crate::storage::DataKey as StorageKey;
use crate::types::{AgreementStatus, RentAgreement};

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    /// Sets the platform fee collector address
    pub fn set_platform_fee_collector(env: Env, collector: Address) {
        collector.require_auth();
        env.storage()
            .instance()
            .set(&StorageKey::PlatformFeeCollector, &collector);
    }

    /// Get a payment record by ID
    pub fn get_payment(env: Env, payment_id: String) -> Result<PaymentRecord, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::Payment(payment_id))
            .ok_or(Error::PaymentNotFound)
    }

    /// Get total payment count
    pub fn get_payment_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&StorageKey::PaymentCount)
            .unwrap_or(0)
    }

    /// Get total amount paid for a specific agreement
    pub fn get_total_paid(env: Env, agreement_id: String) -> Result<i128, Error> {
        let payment_count: u32 = env
            .storage()
            .instance()
            .get(&StorageKey::PaymentCount)
            .unwrap_or(0);

        let mut total: i128 = 0;

        for i in 0..payment_count {
            let payment_id = Self::u32_to_string(&env, i);
            if let Some(payment) = env
                .storage()
                .persistent()
                .get::<StorageKey, PaymentRecord>(&StorageKey::Payment(payment_id))
            {
                if payment.agreement_id == agreement_id {
                    total += payment.amount;
                }
            }
        }

        Ok(total)
    }

    fn u32_to_string(env: &Env, num: u32) -> String {
        match num {
            0 => String::from_str(env, "0"),
            1 => String::from_str(env, "1"),
            2 => String::from_str(env, "2"),
            3 => String::from_str(env, "3"),
            4 => String::from_str(env, "4"),
            5 => String::from_str(env, "5"),
            6 => String::from_str(env, "6"),
            7 => String::from_str(env, "7"),
            8 => String::from_str(env, "8"),
            9 => String::from_str(env, "9"),
            10 => String::from_str(env, "10"),
            _ => String::from_str(env, "unknown"),
        }
    }

    /// Process rent payment with 90/10 landlord/platform split
    /// Follows checks-effects-interactions pattern for reentrancy safety
    pub fn pay_rent(
        env: Env,
        from: Address,
        agreement_id: String,
        payment_amount: i128,
    ) -> Result<(), Error> {
        use soroban_sdk::token;

        // Authorization
        from.require_auth();

        // Load agreement
        let mut agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        // Validation
        if agreement.status != AgreementStatus::Active {
            return Err(Error::AgreementNotActive);
        }

        if from != agreement.tenant {
            return Err(Error::NotTenant);
        }

        if payment_amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        if payment_amount != agreement.monthly_rent {
            return Err(Error::InvalidPaymentAmount);
        }

        let current_time = env.ledger().timestamp();
        if current_time < agreement.next_payment_due {
            return Err(Error::PaymentNotDue);
        }

        // Calculate 90/10 split
        let landlord_amount = (payment_amount * 90) / 100;
        let platform_amount = payment_amount - landlord_amount;

        let platform_collector: Address = env
            .storage()
            .instance()
            .get(&StorageKey::PlatformFeeCollector)
            .ok_or(Error::PaymentFailed)?;

        // Effects: Update state BEFORE external calls
        let payment_month = agreement.payment_history.len();
        agreement.payment_history.set(
            payment_month,
            PaymentSplit {
                landlord_amount,
                platform_amount,
                token: agreement.payment_token.clone(),
                payment_date: current_time,
            },
        );
        agreement.next_payment_due = current_time + 2_592_000; // 30 days

        env.storage()
            .persistent()
            .set(&StorageKey::Agreement(agreement_id.clone()), &agreement);

        // Interactions: External calls AFTER state updates
        let token_client = token::Client::new(&env, &agreement.payment_token);
        token_client.transfer(&from, &agreement.landlord, &landlord_amount);
        token_client.transfer(&from, &platform_collector, &platform_amount);

        Ok(())
    }

    /// Get payment details for a specific month
    pub fn get_payment_split(
        env: Env,
        agreement_id: String,
        month: u32,
    ) -> Result<PaymentSplit, Error> {
        let agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id))
            .ok_or(Error::AgreementNotFound)?;

        agreement
            .payment_history
            .get(month)
            .ok_or(Error::PaymentNotFound)
    }
}
