//! Late fee calculation logic.
//!
//! Supports both simple (linear) and compounding daily late fee models.
//! Formula:
//!   days_over_grace = days_late - grace_period_days  (clamped to 0)
//!
//!   simple:      late_fee = base * (percentage / 100) * days_over_grace
//!   compounding: late_fee = base * ((1 + percentage/100)^days_over_grace) - base
//!
//!   late_fee = min(late_fee, max_late_fee)

use soroban_sdk::{Env, String};

use crate::errors::PaymentError;
use crate::storage::DataKey;
use crate::types::{LateFeeConfig, RentAgreement};

/// Core calculation: given a config and base rent amount, compute the late fee
/// for `days_late` days past the original due date (grace period included).
///
/// Returns 0 if still within the grace period.
pub fn compute_fee(config: &LateFeeConfig, base_amount: i128, days_late: u32) -> i128 {
    if days_late <= config.grace_period_days {
        return 0;
    }

    let days_over = (days_late - config.grace_period_days) as i128;
    let pct = config.late_fee_percentage as i128; // e.g. 5 means 5%

    let raw_fee = if config.compounding {
        // Compound daily: fee = base * ((100 + pct)^days_over / 100^days_over) - base
        // Accumulate numerator and denominator separately to avoid per-step truncation.
        let numerator_base: i128 = 100 + pct;
        let mut num_pow: i128 = 1;
        let mut den_pow: i128 = 1;
        for _ in 0..days_over {
            num_pow = num_pow.saturating_mul(numerator_base);
            den_pow = den_pow.saturating_mul(100);
        }
        let compounded = base_amount.saturating_mul(num_pow) / den_pow;
        compounded.saturating_sub(base_amount)
    } else {
        // Simple: fee = base * pct / 100 * days_over
        base_amount.saturating_mul(pct).saturating_mul(days_over) / 100
    };

    // Cap at max_late_fee (0 means no cap)
    if config.max_late_fee > 0 && raw_fee > config.max_late_fee {
        config.max_late_fee
    } else {
        raw_fee
    }
}

/// Load config + agreement from storage and compute the late fee amount.
pub fn calculate_late_fee_amount(
    env: &Env,
    agreement_id: &String,
    _payment_id: &String,
    days_late: u32,
) -> Result<i128, PaymentError> {
    let config: LateFeeConfig = env
        .storage()
        .persistent()
        .get(&DataKey::LateFeeConfig(agreement_id.clone()))
        .ok_or(PaymentError::LateFeeConfigNotFound)?;

    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(PaymentError::AgreementNotFound)?;

    Ok(compute_fee(&config, agreement.monthly_rent, days_late))
}
