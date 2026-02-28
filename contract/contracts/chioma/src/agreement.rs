//! Agreement management logic for the Chioma/Rental contract.
use soroban_sdk::{Address, Env, Map, String};

use crate::errors::RentalError;
use crate::events;
use crate::storage::DataKey;
use crate::types::{AgreementStatus, PaymentSplit, RentAgreement};

const TTL_THRESHOLD: u32 = 500000;
const TTL_BUMP: u32 = 500000;

/// Validate agreement parameters
///
/// Ensures monthly_rent is strictly positive (i128 > 0) to prevent logical errors
/// in payment calculations and splits.
pub fn validate_agreement_params(
    env: &Env,
    monthly_rent: &i128,
    security_deposit: &i128,
    start_date: &u64,
    end_date: &u64,
    agent_commission_rate: &u32,
) -> Result<(), RentalError> {
    if *monthly_rent <= 0 || *security_deposit < 0 {
        return Err(RentalError::InvalidAmount);
    }

    if *start_date >= *end_date {
        return Err(RentalError::InvalidDate);
    }

    let now = env.ledger().timestamp();
    let grace_period: u64 = 86400; // 1 day in seconds
    if *start_date < now.saturating_sub(grace_period) {
        return Err(RentalError::InvalidDate);
    }

    if *agent_commission_rate > 100 {
        return Err(RentalError::InvalidCommissionRate);
    }

    Ok(())
}

/// Create a new rent agreement
#[allow(clippy::too_many_arguments)]
pub fn create_agreement(
    env: &Env,
    agreement_id: String,
    landlord: Address,
    tenant: Address,
    agent: Option<Address>,
    monthly_rent: i128,
    security_deposit: i128,
    start_date: u64,
    end_date: u64,
    agent_commission_rate: u32,
    payment_token: Address,
) -> Result<(), RentalError> {
    // Tenant MUST authorize creation
    tenant.require_auth();

    // Validate inputs
    validate_agreement_params(
        env,
        &monthly_rent,
        &security_deposit,
        &start_date,
        &end_date,
        &agent_commission_rate,
    )?;

    // Check for duplicate agreement_id
    if env
        .storage()
        .persistent()
        .has(&DataKey::Agreement(agreement_id.clone()))
    {
        return Err(RentalError::AgreementAlreadyExists);
    }

    // Initialize agreement
    let agreement = RentAgreement {
        agreement_id: agreement_id.clone(),
        landlord: landlord.clone(),
        tenant: tenant.clone(),
        agent: agent.clone(),
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent_commission_rate,
        status: AgreementStatus::Draft,
        total_rent_paid: 0,
        payment_count: 0,
        signed_at: None,
        payment_token,
        next_payment_due: start_date,
        payment_history: Map::new(env),
    };

    // Store agreement
    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    // Update counter
    let mut count: u32 = env
        .storage()
        .instance()
        .get(&DataKey::AgreementCount)
        .unwrap_or(0);
    count += 1;
    env.storage()
        .instance()
        .set(&DataKey::AgreementCount, &count);
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);

    // Emit event with topics for indexing
    events::agreement_created(
        env,
        agreement_id,
        tenant,
        landlord,
        monthly_rent,
        security_deposit,
        start_date,
        end_date,
        agent,
    );

    Ok(())
}

/// Sign an agreement as the tenant
pub fn sign_agreement(env: &Env, tenant: Address, agreement_id: String) -> Result<(), RentalError> {
    // Tenant MUST authorize signing
    tenant.require_auth();

    // Retrieve the agreement
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Validate caller is the intended tenant
    if agreement.tenant != tenant {
        return Err(RentalError::NotTenant);
    }

    // Validate agreement is in Pending status
    if agreement.status != AgreementStatus::Pending {
        return Err(RentalError::InvalidState);
    }

    // Validate agreement has not expired
    let current_time = env.ledger().timestamp();
    if current_time > agreement.end_date {
        return Err(RentalError::Expired);
    }

    // Update agreement status and record signing time
    agreement.status = AgreementStatus::Active;
    agreement.signed_at = Some(current_time);

    // Save updated agreement
    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_BUMP);

    // Emit event with topics for indexing
    events::agreement_signed(
        env,
        agreement_id,
        tenant,
        agreement.landlord.clone(),
        current_time,
    );

    Ok(())
}

/// Submit a draft agreement for tenant signature (Draft → Pending)
pub fn submit_agreement(
    env: &Env,
    landlord: Address,
    agreement_id: String,
) -> Result<(), RentalError> {
    landlord.require_auth();

    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    if agreement.landlord != landlord {
        return Err(RentalError::Unauthorized);
    }

    if agreement.status != AgreementStatus::Draft {
        return Err(RentalError::InvalidState);
    }

    agreement.status = AgreementStatus::Pending;

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    events::agreement_submitted(env, agreement_id, landlord, agreement.tenant.clone());

    Ok(())
}

/// Cancel an agreement while in Draft or Pending state
pub fn cancel_agreement(
    env: &Env,
    caller: Address,
    agreement_id: String,
) -> Result<(), RentalError> {
    caller.require_auth();

    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can cancel
    if agreement.landlord != caller {
        return Err(RentalError::Unauthorized);
    }

    // Only in Draft or Pending states
    if agreement.status != AgreementStatus::Draft && agreement.status != AgreementStatus::Pending {
        return Err(RentalError::InvalidState);
    }

    agreement.status = AgreementStatus::Cancelled;

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);
    env.storage().persistent().extend_ttl(
        &DataKey::Agreement(agreement_id.clone()),
        TTL_THRESHOLD,
        TTL_BUMP,
    );

    events::agreement_cancelled(env, agreement_id, caller, agreement.tenant.clone());

    Ok(())
}

/// Retrieve a rent agreement by its unique identifier
pub fn get_agreement(env: &Env, agreement_id: String) -> Option<RentAgreement> {
    env.storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
}

/// Check whether a rent agreement exists for the given identifier
pub fn has_agreement(env: &Env, agreement_id: String) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Agreement(agreement_id))
}

/// Returns the total number of rent agreements created
pub fn get_agreement_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::AgreementCount)
        .unwrap_or(0)
}

/// Get payment split for a specific month in an agreement
pub fn get_payment_split(
    env: &Env,
    agreement_id: String,
    month: u32,
) -> Result<PaymentSplit, RentalError> {
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(RentalError::AgreementNotFound)?;

    agreement
        .payment_history
        .get(month)
        .ok_or(RentalError::AgreementNotFound)
}
