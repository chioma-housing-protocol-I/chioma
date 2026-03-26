#![no_std]
#![allow(clippy::too_many_arguments)]

//! Payment Contract
//!
//! Handles rent payment processing with automatic commission splitting
//! and payment record management.

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

pub mod errors;
pub mod events;
pub mod late_fee;
pub mod payment_impl;
pub mod rate_limit;
pub mod storage;
pub mod types;

#[cfg(test)]
mod tests;

// Re-export public APIs
pub use errors::PaymentError;
pub use payment_impl::{calculate_payment_split, create_payment_record};
pub use storage::DataKey;
pub use types::{
    ExecutionStatus, LateFeeConfig, LateFeeRecord, PaymentExecution, PaymentFrequency,
    PaymentRecord, PaymentSplit, RecurringPayment, RecurringPaymentEvent, RecurringStatus,
};

use crate::errors::PaymentError as Error;
use crate::storage::DataKey as StorageKey;
use crate::types::{AgreementStatus, RentAgreement};

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    fn frequency_to_seconds(frequency: &PaymentFrequency) -> u64 {
        match frequency {
            PaymentFrequency::Daily => 86_400,
            PaymentFrequency::Weekly => 604_800,
            PaymentFrequency::BiWeekly => 1_209_600,
            PaymentFrequency::Monthly => 2_592_000,
            PaymentFrequency::Quarterly => 7_776_000,
            PaymentFrequency::Annually => 31_536_000,
        }
    }

    fn add_failed_payment(env: &Env, recurring_id: &String) {
        let mut failed: Vec<String> = env
            .storage()
            .persistent()
            .get(&StorageKey::FailedRecurringPayments)
            .unwrap_or_else(|| Vec::new(env));

        for i in 0..failed.len() {
            if failed.get(i).unwrap() == recurring_id.clone() {
                return;
            }
        }

        failed.push_back(recurring_id.clone());
        env.storage()
            .persistent()
            .set(&StorageKey::FailedRecurringPayments, &failed);
    }

    fn remove_failed_payment(env: &Env, recurring_id: &String) {
        let failed: Vec<String> = env
            .storage()
            .persistent()
            .get(&StorageKey::FailedRecurringPayments)
            .unwrap_or_else(|| Vec::new(env));
        let mut updated = Vec::new(env);

        for i in 0..failed.len() {
            let item = failed.get(i).unwrap();
            if item != recurring_id.clone() {
                updated.push_back(item);
            }
        }

        env.storage()
            .persistent()
            .set(&StorageKey::FailedRecurringPayments, &updated);
    }

    fn execute_recurring_payment_internal(
        env: &Env,
        recurring_id: &String,
        require_auth: bool,
    ) -> Result<(), Error> {
        let mut recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        if require_auth {
            recurring.payer.require_auth();
        }

        if recurring.status == RecurringStatus::Completed {
            return Err(Error::RecurringPaymentAlreadyCompleted);
        }

        if recurring.status != RecurringStatus::Active {
            return Err(Error::RecurringPaymentNotActive);
        }

        let now = env.ledger().timestamp();
        if now < recurring.next_payment_date {
            return Err(Error::PaymentNotDue);
        }

        if now > recurring.end_date && !recurring.auto_renew {
            recurring.status = RecurringStatus::Completed;
            env.storage().persistent().set(
                &StorageKey::RecurringPayment(recurring_id.clone()),
                &recurring,
            );
            return Err(Error::RecurringPaymentAlreadyCompleted);
        }

        let execution = PaymentExecution {
            recurring_id: recurring_id.clone(),
            executed_at: now,
            amount: recurring.amount,
            status: ExecutionStatus::Success,
            transaction_hash: None,
        };

        let mut executions: Vec<PaymentExecution> = env
            .storage()
            .persistent()
            .get(&StorageKey::PaymentExecutions(recurring_id.clone()))
            .unwrap_or_else(|| Vec::new(env));
        executions.push_back(execution);
        env.storage().persistent().set(
            &StorageKey::PaymentExecutions(recurring_id.clone()),
            &executions,
        );

        let interval = Self::frequency_to_seconds(&recurring.frequency);
        recurring.next_payment_date = recurring.next_payment_date.saturating_add(interval);

        if recurring.next_payment_date > recurring.end_date {
            if recurring.auto_renew {
                recurring.end_date = recurring.end_date.saturating_add(interval);
            } else {
                recurring.status = RecurringStatus::Completed;
            }
        }

        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );

        Self::remove_failed_payment(env, recurring_id);

        let _event = RecurringPaymentEvent::RecurringPaymentExecuted {
            recurring_id: recurring_id.clone(),
            executed_at: now,
        };
        events::recurring_payment_executed(env, recurring_id.clone(), now);

        Ok(())
    }

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

        // Rate limiting check
        crate::rate_limit::check_rate_limit(&env, &from, "pay_rent")?;

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

    pub fn create_recurring_payment(
        env: Env,
        agreement_id: String,
        amount: i128,
        frequency: PaymentFrequency,
        start_date: u64,
        end_date: u64,
        auto_renew: bool,
    ) -> Result<String, Error> {
        let agreement: RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        agreement.tenant.require_auth();

        if amount <= 0 || amount != agreement.monthly_rent {
            return Err(Error::InvalidPaymentAmount);
        }

        if start_date >= end_date {
            return Err(Error::InvalidRecurringDates);
        }

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&StorageKey::RecurringPaymentCount)
            .unwrap_or(0);
        count = count.saturating_add(1);

        let recurring_id = Self::u32_to_string(&env, count);
        let recurring = RecurringPayment {
            id: recurring_id.clone(),
            agreement_id: agreement_id.clone(),
            payer: agreement.tenant,
            payee: agreement.landlord,
            amount,
            frequency,
            start_date,
            end_date,
            next_payment_date: start_date,
            status: RecurringStatus::Active,
            auto_renew,
        };

        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );
        env.storage()
            .instance()
            .set(&StorageKey::RecurringPaymentCount, &count);

        let _event = RecurringPaymentEvent::RecurringPaymentCreated {
            recurring_id: recurring_id.clone(),
            agreement_id: agreement_id.clone(),
            amount,
        };
        events::recurring_payment_created(&env, recurring_id.clone(), agreement_id, amount);

        Ok(recurring_id)
    }

    pub fn execute_recurring_payment(env: Env, recurring_id: String) -> Result<(), Error> {
        Self::execute_recurring_payment_internal(&env, &recurring_id, true)
    }

    pub fn pause_recurring_payment(env: Env, recurring_id: String) -> Result<(), Error> {
        let mut recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        recurring.payer.require_auth();

        if recurring.status == RecurringStatus::Cancelled {
            return Err(Error::RecurringPaymentAlreadyCancelled);
        }

        if recurring.status == RecurringStatus::Completed {
            return Err(Error::RecurringPaymentAlreadyCompleted);
        }

        if recurring.status != RecurringStatus::Active {
            return Err(Error::RecurringPaymentNotActive);
        }

        recurring.status = RecurringStatus::Paused;
        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );

        let _event = RecurringPaymentEvent::RecurringPaymentPaused {
            recurring_id: recurring_id.clone(),
        };
        events::recurring_payment_paused(&env, recurring_id);

        Ok(())
    }

    pub fn resume_recurring_payment(env: Env, recurring_id: String) -> Result<(), Error> {
        let mut recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        recurring.payer.require_auth();

        if recurring.status != RecurringStatus::Paused {
            return Err(Error::RecurringPaymentNotPaused);
        }

        recurring.status = RecurringStatus::Active;
        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );

        let _event = RecurringPaymentEvent::RecurringPaymentResumed {
            recurring_id: recurring_id.clone(),
        };
        events::recurring_payment_resumed(&env, recurring_id);

        Ok(())
    }

    pub fn cancel_recurring_payment(env: Env, recurring_id: String) -> Result<(), Error> {
        let mut recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        recurring.payer.require_auth();

        if recurring.status == RecurringStatus::Cancelled {
            return Err(Error::RecurringPaymentAlreadyCancelled);
        }

        recurring.status = RecurringStatus::Cancelled;
        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );

        let _event = RecurringPaymentEvent::RecurringPaymentCancelled {
            recurring_id: recurring_id.clone(),
        };
        events::recurring_payment_cancelled(&env, recurring_id);

        Ok(())
    }

    pub fn get_recurring_payment(
        env: Env,
        recurring_id: String,
    ) -> Result<RecurringPayment, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id))
            .ok_or(Error::RecurringPaymentNotFound)
    }

    pub fn get_payment_executions(
        env: Env,
        recurring_id: String,
    ) -> Result<Vec<PaymentExecution>, Error> {
        let _recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        Ok(env
            .storage()
            .persistent()
            .get(&StorageKey::PaymentExecutions(recurring_id))
            .unwrap_or_else(|| Vec::new(&env)))
    }

    pub fn process_due_payments(env: Env) -> Result<Vec<String>, Error> {
        let due = Self::get_due_payments(env.clone())?;
        let mut processed = Vec::new(&env);

        for i in 0..due.len() {
            let recurring_id = due.get(i).unwrap();
            match Self::execute_recurring_payment_internal(&env, &recurring_id, false) {
                Ok(()) => {
                    processed.push_back(recurring_id);
                }
                Err(_) => {
                    if let Some(mut recurring) = env
                        .storage()
                        .persistent()
                        .get::<StorageKey, RecurringPayment>(&StorageKey::RecurringPayment(
                            recurring_id.clone(),
                        ))
                    {
                        recurring.status = RecurringStatus::Failed;
                        env.storage().persistent().set(
                            &StorageKey::RecurringPayment(recurring_id.clone()),
                            &recurring,
                        );
                        Self::add_failed_payment(&env, &recurring_id);

                        let _event = RecurringPaymentEvent::RecurringPaymentFailed {
                            recurring_id: recurring_id.clone(),
                        };
                        events::recurring_payment_failed(&env, recurring_id);
                    }
                }
            }
        }

        Ok(processed)
    }

    pub fn get_due_payments(env: Env) -> Result<Vec<String>, Error> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&StorageKey::RecurringPaymentCount)
            .unwrap_or(0);

        let now = env.ledger().timestamp();
        let mut due = Vec::new(&env);

        for i in 1..=count {
            let recurring_id = Self::u32_to_string(&env, i);
            if let Some(recurring) = env
                .storage()
                .persistent()
                .get::<StorageKey, RecurringPayment>(&StorageKey::RecurringPayment(
                    recurring_id.clone(),
                ))
            {
                if recurring.status == RecurringStatus::Active
                    && recurring.next_payment_date <= now
                    && (recurring.auto_renew || now <= recurring.end_date)
                {
                    due.push_back(recurring_id);
                }
            }
        }

        Ok(due)
    }

    pub fn retry_failed_payment(env: Env, recurring_id: String) -> Result<(), Error> {
        let mut recurring: RecurringPayment = env
            .storage()
            .persistent()
            .get(&StorageKey::RecurringPayment(recurring_id.clone()))
            .ok_or(Error::RecurringPaymentNotFound)?;

        recurring.payer.require_auth();

        if recurring.status != RecurringStatus::Failed {
            return Err(Error::RecurringPaymentNotFailed);
        }

        recurring.status = RecurringStatus::Active;
        env.storage().persistent().set(
            &StorageKey::RecurringPayment(recurring_id.clone()),
            &recurring,
        );

        Self::execute_recurring_payment_internal(&env, &recurring_id, true)
            .map_err(|_| Error::RecurringPaymentExecutionFailed)
    }

    pub fn get_failed_payments(env: Env) -> Result<Vec<String>, Error> {
        Ok(env
            .storage()
            .persistent()
            .get(&StorageKey::FailedRecurringPayments)
            .unwrap_or_else(|| Vec::new(&env)))
    }

    // ─── Late Fee Functions ───────────────────────────────────────────────────

    /// Set or update the late fee configuration for an agreement.
    /// Only the landlord of the agreement may call this.
    pub fn set_late_fee_config(
        env: Env,
        agreement_id: String,
        late_fee_percentage: u32,
        grace_period_days: u32,
        max_late_fee: i128,
        compounding: bool,
    ) -> Result<(), Error> {
        use crate::types::LateFeeConfig;

        if late_fee_percentage == 0 || late_fee_percentage > 100 {
            return Err(Error::InvalidLateFeePercentage);
        }

        let agreement: crate::types::RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        agreement.landlord.require_auth();

        let config = LateFeeConfig {
            agreement_id: agreement_id.clone(),
            late_fee_percentage,
            grace_period_days,
            max_late_fee,
            compounding,
        };

        env.storage()
            .persistent()
            .set(&StorageKey::LateFeeConfig(agreement_id.clone()), &config);

        crate::events::late_fee_config_set(
            &env,
            agreement_id,
            late_fee_percentage,
            grace_period_days,
        );

        Ok(())
    }

    /// Get the late fee configuration for an agreement.
    pub fn get_late_fee_config(
        env: Env,
        agreement_id: String,
    ) -> Result<crate::types::LateFeeConfig, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::LateFeeConfig(agreement_id))
            .ok_or(Error::LateFeeConfigNotFound)
    }

    /// Calculate the late fee for a payment given how many days late it is.
    /// Returns the late fee amount (not yet persisted).
    pub fn calculate_late_fee(
        env: Env,
        agreement_id: String,
        payment_id: String,
        days_late: u32,
    ) -> Result<i128, Error> {
        crate::late_fee::calculate_late_fee_amount(&env, &agreement_id, &payment_id, days_late)
    }

    /// Apply the late fee to a payment, creating a LateFeeRecord.
    /// Derives days_late from the current ledger timestamp vs the agreement's
    /// next_payment_due, then persists the record.
    pub fn apply_late_fee(
        env: Env,
        agreement_id: String,
        payment_id: String,
    ) -> Result<crate::types::LateFeeRecord, Error> {
        use crate::types::LateFeeRecord;

        // Ensure not already applied
        if env
            .storage()
            .persistent()
            .get::<StorageKey, LateFeeRecord>(&StorageKey::LateFeeRecord(payment_id.clone()))
            .is_some()
        {
            return Err(Error::LateFeeAlreadyApplied);
        }

        let agreement: crate::types::RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id.clone()))
            .ok_or(Error::AgreementNotFound)?;

        let config: crate::types::LateFeeConfig = env
            .storage()
            .persistent()
            .get(&StorageKey::LateFeeConfig(agreement_id.clone()))
            .ok_or(Error::LateFeeConfigNotFound)?;

        let now = env.ledger().timestamp();
        let seconds_per_day: u64 = 86_400;
        let grace_seconds = (config.grace_period_days as u64) * seconds_per_day;
        let due_with_grace = agreement.next_payment_due.saturating_add(grace_seconds);

        if now <= due_with_grace {
            return Err(Error::PaymentNotLate);
        }

        let seconds_over = now.saturating_sub(due_with_grace);
        // days_over_grace is how many full days past the grace window
        let days_over_grace = (seconds_over / seconds_per_day) as u32;
        // compute_fee expects total days_late (it subtracts grace internally)
        let days_late_total = days_over_grace + config.grace_period_days;

        let late_fee = crate::late_fee::calculate_late_fee_amount(
            &env,
            &agreement_id,
            &payment_id,
            days_late_total,
        )?;

        let record = LateFeeRecord {
            payment_id: payment_id.clone(),
            days_late: days_over_grace,
            base_amount: agreement.monthly_rent,
            late_fee,
            total_due: agreement.monthly_rent + late_fee,
            calculated_at: now,
            waived: false,
            waive_reason: None,
        };

        env.storage()
            .persistent()
            .set(&StorageKey::LateFeeRecord(payment_id.clone()), &record);

        crate::events::late_fee_applied(&env, payment_id, late_fee, days_over_grace);

        Ok(record)
    }

    /// Retrieve a previously applied late fee record.
    pub fn get_late_fee_record(
        env: Env,
        payment_id: String,
    ) -> Result<crate::types::LateFeeRecord, Error> {
        env.storage()
            .persistent()
            .get(&StorageKey::LateFeeRecord(payment_id))
            .ok_or(Error::LateFeeRecordNotFound)
    }

    /// Waive a late fee. Only the landlord of the associated agreement may call this.
    pub fn waive_late_fee(
        env: Env,
        agreement_id: String,
        payment_id: String,
        reason: String,
    ) -> Result<(), Error> {
        use crate::types::LateFeeRecord;

        let agreement: crate::types::RentAgreement = env
            .storage()
            .persistent()
            .get(&StorageKey::Agreement(agreement_id))
            .ok_or(Error::AgreementNotFound)?;

        agreement.landlord.require_auth();

        let mut record: LateFeeRecord = env
            .storage()
            .persistent()
            .get(&StorageKey::LateFeeRecord(payment_id.clone()))
            .ok_or(Error::LateFeeRecordNotFound)?;

        if record.waived {
            return Err(Error::LateFeeAlreadyWaived);
        }

        record.waived = true;
        record.waive_reason = Some(reason.clone());
        record.total_due = record.base_amount; // remove late fee from total

        env.storage()
            .persistent()
            .set(&StorageKey::LateFeeRecord(payment_id.clone()), &record);

        crate::events::late_fee_waived(&env, payment_id, reason);

        Ok(())
    }
}
