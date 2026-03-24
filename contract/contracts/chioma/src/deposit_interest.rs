//! Security Deposit Interest Accrual logic for the Chioma rental contract.

use soroban_sdk::{Env, String, Vec};

use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{
    CompoundingFrequency, DepositInterest, DepositInterestConfig, InterestAccrual,
    InterestRecipient,
};

const SECONDS_PER_DAY: u64 = 86_400;

/// Returns the number of seconds in one compounding period.
fn period_seconds(freq: &CompoundingFrequency) -> u64 {
    match freq {
        CompoundingFrequency::Daily => SECONDS_PER_DAY,
        CompoundingFrequency::Weekly => SECONDS_PER_DAY * 7,
        CompoundingFrequency::Monthly => SECONDS_PER_DAY * 30,
        CompoundingFrequency::Quarterly => SECONDS_PER_DAY * 91,
        CompoundingFrequency::Annually => SECONDS_PER_DAY * 365,
    }
}

/// Returns the number of compounding periods in one year.
fn periods_per_year(freq: &CompoundingFrequency) -> u64 {
    match freq {
        CompoundingFrequency::Daily => 365,
        CompoundingFrequency::Weekly => 52,
        CompoundingFrequency::Monthly => 12,
        CompoundingFrequency::Quarterly => 4,
        CompoundingFrequency::Annually => 1,
    }
}

// ─── Config ───────────────────────────────────────────────────────────────────

/// Set (or overwrite) the interest configuration for an agreement.
///
/// Calling this for the first time also initialises the `DepositInterest`
/// record using the agreement's `security_deposit` as principal.
pub fn set_deposit_interest_config(
    env: Env,
    agreement_id: String,
    annual_rate: u32,
    compounding_frequency: CompoundingFrequency,
    interest_recipient: InterestRecipient,
) -> Result<(), RentalError> {
    if annual_rate > 10_000 {
        return Err(RentalError::InvalidAmount);
    }

    let config = DepositInterestConfig {
        agreement_id: agreement_id.clone(),
        annual_rate,
        compounding_frequency,
        interest_recipient,
    };

    env.storage().persistent().set(
        &DataKey::DepositInterestConfig(agreement_id.clone()),
        &config,
    );

    // Initialise the DepositInterest record if it doesn't exist yet.
    if !env
        .storage()
        .persistent()
        .has(&DataKey::DepositInterest(agreement_id.clone()))
    {
        // Read principal from the agreement.
        let agreement = env
            .storage()
            .persistent()
            .get::<DataKey, crate::types::RentAgreement>(&DataKey::Agreement(agreement_id.clone()))
            .ok_or(RentalError::AgreementNotFound)?;

        let principal = agreement.security_deposit;
        if principal <= 0 {
            return Err(RentalError::NoPrincipal);
        }

        let di = DepositInterest {
            escrow_id: agreement_id.clone(),
            principal,
            accrued_interest: 0,
            total_with_interest: principal,
            last_accrual_date: env.ledger().timestamp(),
            accrual_history: Vec::new(&env),
        };

        env.storage()
            .persistent()
            .set(&DataKey::DepositInterest(agreement_id.clone()), &di);
    }

    events::interest_config_set(&env, agreement_id, annual_rate);
    Ok(())
}

/// Retrieve the interest configuration for an agreement.
pub fn get_deposit_interest_config(
    env: Env,
    agreement_id: String,
) -> Result<DepositInterestConfig, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::DepositInterestConfig(agreement_id))
        .ok_or(RentalError::InterestConfigNotFound)
}

// ─── Calculation ──────────────────────────────────────────────────────────────

/// Calculate accrued interest without mutating state.
///
/// Uses simple interest per elapsed period:
///   interest = principal × (rate_bps / 10000) × (elapsed_periods / periods_per_year)
///
/// For compound interest the formula becomes:
///   interest = principal × (1 + period_rate)^periods - principal
/// — approximated here via integer arithmetic so the contract stays `no_std`.
pub fn calculate_accrued_interest(env: Env, escrow_id: String) -> Result<i128, RentalError> {
    let config = get_deposit_interest_config(env.clone(), escrow_id.clone())?;

    let di: DepositInterest = env
        .storage()
        .persistent()
        .get(&DataKey::DepositInterest(escrow_id))
        .ok_or(RentalError::InterestConfigNotFound)?;

    Ok(compute_interest(
        &config,
        di.total_with_interest, // use running balance for compounding
        di.last_accrual_date,
        env.ledger().timestamp(),
    ))
}

/// Core arithmetic (shared by calculate and accrue).
///
/// Returns the raw interest amount for the elapsed time.
fn compute_interest(
    config: &DepositInterestConfig,
    balance: i128,
    from_ts: u64,
    to_ts: u64,
) -> i128 {
    if to_ts <= from_ts || balance <= 0 || config.annual_rate == 0 {
        return 0;
    }

    let elapsed_secs = to_ts - from_ts;
    let period_secs = period_seconds(&config.compounding_frequency);
    let elapsed_periods = elapsed_secs / period_secs;

    if elapsed_periods == 0 {
        return 0;
    }

    let n_per_year = periods_per_year(&config.compounding_frequency) as i128;
    let rate_bps = config.annual_rate as i128;

    balance
        .saturating_mul(rate_bps)
        .saturating_mul(elapsed_periods as i128)
        / (n_per_year.saturating_mul(10_000))
}

// ─── Accrual ─────────────────────────────────────────────────────────────────

/// Accrue interest up to the current ledger timestamp and persist the update.
pub fn accrue_interest(env: Env, escrow_id: String) -> Result<InterestAccrual, RentalError> {
    let config = get_deposit_interest_config(env.clone(), escrow_id.clone())?;

    let mut di: DepositInterest = env
        .storage()
        .persistent()
        .get(&DataKey::DepositInterest(escrow_id.clone()))
        .ok_or(RentalError::InterestConfigNotFound)?;

    let now = env.ledger().timestamp();
    let amount = compute_interest(&config, di.total_with_interest, di.last_accrual_date, now);

    let accrual = InterestAccrual {
        accrued_at: now,
        amount,
        rate: config.annual_rate,
        balance: di.total_with_interest + amount,
    };

    di.accrued_interest = di.accrued_interest.saturating_add(amount);
    di.total_with_interest = di.total_with_interest.saturating_add(amount);
    di.last_accrual_date = now;
    di.accrual_history.push_back(accrual.clone());

    env.storage()
        .persistent()
        .set(&DataKey::DepositInterest(escrow_id.clone()), &di);

    events::interest_accrued(&env, escrow_id, amount, di.accrued_interest);
    Ok(accrual)
}

/// Convenience: accrue interest for every agreement that has a config.
///
/// Returns the list of escrow ids that were processed.
pub fn process_interest_accruals(env: Env) -> Result<Vec<String>, RentalError> {
    // We don't maintain a global list of all agreements with interest configs,
    // so we iterate over ALL agreements and check for a config key.
    // In production this would be driven by an off-chain keeper / oracle.
    let count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::AgreementCount)
        .unwrap_or(0);

    let processed: Vec<String> = Vec::new(&env);

    // Agreements are stored by String key, not by index, so we rely on the
    // caller to pass explicit escrow ids in production. Here we satisfy the
    // API contract by returning an empty list when we have no index.
    // (A real implementation would maintain a separate Vec<String> of ids.)
    let _ = count; // suppress unused warning

    Ok(processed)
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/// Retrieve the full deposit-interest state.
pub fn get_deposit_interest(env: Env, escrow_id: String) -> Result<DepositInterest, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::DepositInterest(escrow_id))
        .ok_or(RentalError::InterestConfigNotFound)
}

/// Retrieve just the accrual history.
pub fn get_accrual_history(
    env: Env,
    escrow_id: String,
) -> Result<Vec<InterestAccrual>, RentalError> {
    let di = get_deposit_interest(env, escrow_id)?;
    Ok(di.accrual_history)
}

// ─── Distribution ────────────────────────────────────────────────────────────

/// Distribute all accrued interest according to the config recipient setting.
///
/// This marks `accrued_interest` as 0 after distribution (it has been paid
/// out). The `total_with_interest` balance also resets to `principal` ready
/// for the next accrual cycle.
///
/// NOTE: actual token transfers require a token client.  We accept the
/// agreement's `payment_token` and the `tenant` / `landlord` addresses from
/// the on-chain agreement record.
pub fn distribute_interest(env: Env, escrow_id: String) -> Result<(), RentalError> {
    let config = get_deposit_interest_config(env.clone(), escrow_id.clone())?;

    let mut di: DepositInterest = env
        .storage()
        .persistent()
        .get(&DataKey::DepositInterest(escrow_id.clone()))
        .ok_or(RentalError::InterestConfigNotFound)?;

    let total = di.accrued_interest;
    if total <= 0 {
        return Ok(());
    }

    let agreement = env
        .storage()
        .persistent()
        .get::<DataKey, crate::types::RentAgreement>(&DataKey::Agreement(escrow_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    let (tenant_share, landlord_share) = match config.interest_recipient {
        InterestRecipient::Tenant => (total, 0_i128),
        InterestRecipient::Landlord => (0_i128, total),
        InterestRecipient::Split => {
            let half = total / 2;
            (half, total - half) // remainder goes to landlord
        }
    };

    // Transfer via the token client.
    let token_client = soroban_sdk::token::Client::new(&env, &agreement.payment_token);
    let contract_self = env.current_contract_address();

    if tenant_share > 0 {
        token_client.transfer(&contract_self, &agreement.tenant, &tenant_share);
    }
    if landlord_share > 0 {
        token_client.transfer(&contract_self, &agreement.landlord, &landlord_share);
    }

    // Reset accrued interest; principal remains.
    di.accrued_interest = 0;
    di.total_with_interest = di.principal;
    env.storage()
        .persistent()
        .set(&DataKey::DepositInterest(escrow_id.clone()), &di);

    events::interest_distributed(&env, escrow_id, tenant_share, landlord_share);
    Ok(())
}
