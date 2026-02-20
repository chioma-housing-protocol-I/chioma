//! Agreement management logic for the Chioma/Rental contract.
use soroban_sdk::{Address, Env, Map, String};

use crate::errors::RentalError;
use crate::events::{AgreementCreatedEvent, AgreementSigned};
use crate::storage::DataKey;
use crate::types::{AgreementStatus, PaymentSplit, RentAgreement};

/// Validate agreement parameters
///
/// Ensures monthly_rent is strictly positive (i128 > 0) to prevent logical errors
/// in payment calculations and splits.
pub fn validate_agreement_params(
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
        landlord,
        tenant,
        agent,
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

    // Emit event
    AgreementCreatedEvent { agreement_id }.publish(env);

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

    // Emit AgreementSigned event
    AgreementSigned {
        agreement_id,
        landlord: agreement.landlord.clone(),
        tenant: tenant.clone(),
        signed_at: current_time,
    }
    .publish(env);

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
