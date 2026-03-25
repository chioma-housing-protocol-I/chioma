//! Agreement management logic for the Chioma/Rental contract.
use soroban_sdk::{Address, Env, String, Vec};

use crate::errors::RentalError;
use crate::events;
use crate::rate_limit;
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
pub fn create_agreement(env: &Env, input: crate::types::AgreementInput) -> Result<(), RentalError> {
    // Tenant MUST authorize creation
    input.tenant.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &input.tenant, "create_agreement")?;

    create_agreement_internal(env, input)
}

#[allow(clippy::too_many_arguments)]
fn create_agreement_internal(
    env: &Env,
    input: crate::types::AgreementInput,
) -> Result<(), RentalError> {
    // Validate inputs
    validate_agreement_params(
        env,
        &input.terms.monthly_rent,
        &input.terms.security_deposit,
        &input.terms.start_date,
        &input.terms.end_date,
        &input.terms.agent_commission_rate,
    )?;

    let agreement_id = input.agreement_id.clone();

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
        landlord: input.landlord.clone(),
        tenant: input.tenant.clone(),
        agent: input.agent.clone(),
        monthly_rent: input.terms.monthly_rent,
        security_deposit: input.terms.security_deposit,
        start_date: input.terms.start_date,
        end_date: input.terms.end_date,
        agent_commission_rate: input.terms.agent_commission_rate,
        status: AgreementStatus::Draft,
        total_rent_paid: 0,
        payment_count: 0,
        signed_at: None,
        payment_token: input.payment_token.clone(),
        next_payment_due: input.terms.start_date,
        metadata_uri: input.metadata_uri,
        attributes: input.attributes,
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
        agreement.tenant.clone(),
        agreement.landlord.clone(),
        agreement.monthly_rent,
        agreement.security_deposit,
        agreement.start_date,
        agreement.end_date,
        agreement.agent,
    );

    Ok(())
}

/// Sign an agreement as the tenant
pub fn sign_agreement(env: &Env, tenant: Address, agreement_id: String) -> Result<(), RentalError> {
    // Tenant MUST authorize signing
    tenant.require_auth();

    // Rate limiting check
    rate_limit::check_rate_limit(env, &tenant, "sign_agreement")?;

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

pub fn get_payment_split(
    env: &Env,
    agreement_id: String,
    month: u32,
) -> Result<PaymentSplit, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::PaymentRecord(agreement_id, month))
        .ok_or(RentalError::AgreementNotFound)
}

/// Get all payments for an agreement
pub fn get_payment_history(env: &Env, agreement_id: String) -> Vec<PaymentSplit> {
    let mut history = Vec::new(env);
    let agreement: RentAgreement = match env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
    {
        Some(a) => a,
        None => return history,
    };

    for i in 1..=agreement.payment_count {
        if let Some(payment) = env
            .storage()
            .persistent()
            .get(&DataKey::PaymentRecord(agreement_id.clone(), i))
        {
            history.push_back(payment);
        }
    }
    history
}

/// Update metadata for an agreement
pub fn update_metadata(
    env: &Env,
    agreement_id: String,
    metadata_uri: String,
    attributes: Vec<crate::types::Attribute>,
) -> Result<(), RentalError> {
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    agreement.landlord.require_auth();

    agreement.metadata_uri = metadata_uri;
    agreement.attributes = attributes;

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id), &agreement);
    Ok(())
}

/// Create a new agreement with a specific payment token
#[allow(clippy::too_many_arguments)]
pub fn create_agreement_with_token(
    env: &Env,
    input: crate::types::AgreementInput,
) -> Result<String, RentalError> {
    input.tenant.require_auth();

    // Check if token is supported
    if !crate::multi_token::is_token_supported(env.clone(), input.payment_token.clone())? {
        return Err(RentalError::TokenNotSupported);
    }

    let agreement_id = input.agreement_id.clone();

    create_agreement_internal(env, input)?;

    // Store the token mapping explicitly if needed, but it's already in RentAgreement
    // Wait, create_agreement_internal already set the agreement.
    // We just need the extra DataKey::AgreementToken if the frontend relies on it.
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .unwrap();

    env.storage().persistent().set(
        &DataKey::AgreementToken(agreement_id.clone()),
        &agreement.payment_token,
    );

    Ok(agreement_id)
}

/// Get the payment token for an agreement
pub fn get_agreement_token(env: &Env, agreement_id: String) -> Result<Address, RentalError> {
    env.storage()
        .persistent()
        .get(&DataKey::AgreementToken(agreement_id))
        .ok_or(RentalError::AgreementNotFound)
}

/// Make a payment for an agreement using a specific token
pub fn make_payment_with_token(
    env: &Env,
    agreement_id: String,
    amount: i128,
    token: Address,
) -> Result<(), RentalError> {
    let mut agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id.clone()))
        .ok_or(RentalError::AgreementNotFound)?;

    if agreement.status != AgreementStatus::Active {
        return Err(RentalError::AgreementNotActive);
    }

    agreement.tenant.require_auth();

    // Convert amount to the agreement's base token if they differ
    let amount_in_base = if token != agreement.payment_token {
        crate::multi_token::convert_amount(
            env.clone(),
            token.clone(),
            agreement.payment_token.clone(),
            amount,
        )?
    } else {
        amount
    };

    if amount_in_base < agreement.monthly_rent {
        return Err(RentalError::InsufficientPayment);
    }

    // Transfer tokens from tenant to contract (escrow)
    let client = soroban_sdk::token::Client::new(env, &token);
    client.transfer(&agreement.tenant, env.current_contract_address(), &amount);

    // Update agreement state
    agreement.total_rent_paid += amount_in_base;
    agreement.payment_count += 1;

    // Simple split for now: 100% to landlord
    let split = PaymentSplit {
        landlord_amount: amount_in_base,
        platform_amount: 0,
        token: token.clone(),
        payment_date: env.ledger().timestamp(),
        payer: agreement.tenant.clone(),
    };

    let record_key = DataKey::PaymentRecord(agreement_id.clone(), agreement.payment_count);
    env.storage().persistent().set(&record_key, &split);
    env.storage()
        .persistent()
        .extend_ttl(&record_key, TTL_THRESHOLD, TTL_BUMP);

    env.storage()
        .persistent()
        .set(&DataKey::Agreement(agreement_id.clone()), &agreement);

    events::payment_made_with_token(env, agreement_id, token, amount);

    Ok(())
}

/// Release escrow for an agreement
pub fn release_escrow_with_token(
    env: &Env,
    escrow_id: String,
    token: Address,
) -> Result<(), RentalError> {
    // For simplicity, we assume escrow_id is the agreement_id
    let agreement_id = escrow_id.clone();
    let agreement: RentAgreement = env
        .storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(RentalError::AgreementNotFound)?;

    // Only landlord can release? Or admin?
    // Let's assume landlord for this implementation
    agreement.landlord.require_auth();

    let contract_addr = env.current_contract_address();
    let client = soroban_sdk::token::Client::new(env, &token);
    let balance = client.balance(&contract_addr);

    if balance > 0 {
        client.transfer(&contract_addr, &agreement.landlord, &balance);
    }

    events::escrow_released_with_token(env, escrow_id, token, balance);

    Ok(())
}
